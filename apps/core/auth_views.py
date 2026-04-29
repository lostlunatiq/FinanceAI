from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .auth_serializers import LoginSerializer, UserProfileSerializer, RegisterUserSerializer
from .permissions import HasMinimumGrade
from .models import User, AuditLog


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        refresh["username"] = user.username
        refresh["employee_grade"] = user.employee_grade  # ← grade in token, not role
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access": str(refresh.access_token)})
        except Exception:
            return Response(
                {"error": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED
            )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        if not old_password or not new_password:
            return Response(
                {"detail": "old_password and new_password required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(old_password):
            return Response(
                {"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST
            )
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class RegisterView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class UserListView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

    def get(self, request):
        users = User.objects.filter(vendor_profile__isnull=True).order_by("employee_grade", "first_name")
        # Fix 4 — remove role_filter, filter by grade instead
        grade_filter = request.query_params.get("grade")
        if grade_filter:
            users = users.filter(employee_grade=grade_filter)
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q

            users = users.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return Response(UserProfileSerializer(users, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserProfileSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        allowed_fields = {
            "is_active",
            "first_name",
            "last_name",
            "email",
            "employee_grade",
            "department",
            "is_superuser",
            "groups",
        }
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        if "password" in request.data:
            new_pass = request.data["password"]
            if len(new_pass) >= 6:
                user.set_password(new_pass)

        serializer = UserProfileSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response({"detail": "Cannot delete your own account."}, status=400)
        if user.is_superuser and not request.user.is_superuser:
            return Response({"detail": "Only superusers can delete superuser accounts."}, status=403)
        user.delete()
        return Response({"detail": "User deleted."}, status=204)


class DepartmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Department
        depts = Department.objects.all().values("id", "name").order_by("name")
        return Response(list(depts))


class AuditLogListView(APIView):
    """
    GET /api/v1/audit/ — Paginated audit log with role-based visibility.

    Visibility tiers:
      - Vendor          : only their own invoice lifecycle events (no internal notes)
      - G1 Employee     : only their own actions
      - G2 HOD          : actions by G1 and G2 users (no finance-level notes)
      - G3 Finance Mgr  : actions by G1-G3 users (no CFO overrides)
      - G4 Finance Admin: full trail of everyone *below* CFO; sees who paused,
                          who uploaded, when documents arrived; no CFO-tier overrides
      - G5 / superuser  : full unrestricted access (CFO)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        grade = user.employee_grade or 1
        is_vendor = hasattr(user, "vendor_profile") and user.vendor_profile is not None
        is_cfo = user.is_superuser or grade >= 5

        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))
        entity_type = request.query_params.get("entity_type")
        action_filter = request.query_params.get("action")

        qs = AuditLog.objects.select_related("user").order_by("-created_at")

        if is_vendor:
            # Vendors see only their own invoice lifecycle events — no internal details
            from apps.invoices.models import Expense

            vendor_expense_ids = list(
                Expense.objects.filter(vendor=user.vendor_profile).values_list("id", flat=True)
            )
            vendor_visible_actions = [
                "expense.submitted",
                "expense.approved",
                "expense.rejected",
                "expense.query_raised",
                "expense.pending_l1",
                "expense.pending_hod",
                "expense.pending_fin_l1",
                "expense.pending_fin_l2",
                "expense.pending_fin_head",
                "expense.paid",
                "expense.withdrawn",
            ]
            qs = qs.filter(
                entity_type="Expense",
                entity_id__in=vendor_expense_ids,
                action__in=vendor_visible_actions,
            )

        elif not is_cfo and grade < 4:
            # Mid-level: restrict to logs from users at or below their grade
            visible_user_ids = list(
                User.objects.filter(
                    employee_grade__lte=grade, is_active=True
                ).values_list("id", flat=True)
            )
            if str(user.id) not in [str(uid) for uid in visible_user_ids]:
                visible_user_ids.append(user.id)

            qs = qs.filter(user_id__in=visible_user_ids)

            # G2 HOD cannot see finance-level or CFO override actions
            if grade < 3:
                qs = qs.exclude(
                    action__in=[
                        "expense.pending_fin_l1",
                        "expense.pending_fin_l2",
                        "expense.pending_fin_head",
                        "expense.superior_override_approved",
                    ]
                )
            else:
                # G3 cannot see CFO overrides
                qs = qs.exclude(action="expense.superior_override_approved")

        elif not is_cfo and grade == 4:
            # G4 Finance Admin: full trail BELOW CFO. Excludes CFO actions and superuser overrides.
            # This gives admins the document lifecycle (arrival, hold, upload, approval) while
            # keeping CFO-tier strategic actions opaque.
            cfo_user_ids = list(
                User.objects.filter(
                    Q(is_superuser=True) | Q(employee_grade__gte=5)
                ).values_list("id", flat=True)
            )
            qs = qs.exclude(user_id__in=cfo_user_ids).exclude(
                action__in=[
                    "expense.superior_override_approved",
                ]
            )

        # G5+ / superuser (CFO): full access — sees ALL juniors' approve/reject/comments,
        # superior overrides, and every entity. No additional filtering.

        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if action_filter:
            qs = qs.filter(action__icontains=action_filter)
        # user_id filter only available to admins
        user_id_param = request.query_params.get("user_id")
        if user_id_param and (user.is_superuser or grade >= 4):
            qs = qs.filter(user_id=user_id_param)

        total = qs.count()
        entries = qs[offset : offset + limit]

        results = []
        for entry in entries:
            details = entry.masked_after or {}
            # Strip internal fields from vendor-facing view
            if is_vendor:
                details = {
                    k: v for k, v in details.items()
                    if k not in ("reason", "override", "actor_grade", "note")
                }
            results.append(
                {
                    "id": str(entry.id),
                    "action": entry.action,
                    "entity_type": entry.entity_type,
                    "entity_id": str(entry.entity_id) if entry.entity_id else None,
                    "actor": entry.user.get_full_name() if entry.user else "System",
                    "actor_role": entry.user.employee_grade if entry.user else None,
                    "timestamp": entry.created_at.isoformat(),
                    "details": details,
                }
            )

        return Response({"total": total, "results": results, "limit": limit, "offset": offset})


class NLQueryView(APIView):
    """
    POST /api/v1/nl-query/
    Natural language query against financial data.
    Body: {"question": "What are my top 5 vendors by spend?"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "").strip()
        if not question:
            return Response({"error": "question is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            answer = _run_nl_query(question, request.user)
            return Response(answer)
        except Exception as e:
            return Response(
                {"error": str(e), "answer": "Unable to process query at this time."},
                status=status.HTTP_200_OK,
            )


def _run_nl_query(question: str, user) -> dict:
    """Run NL query using OpenRouter and real DB data, scoped by user role."""
    from ai.tools.openrouter_client import call_text_model
    from apps.invoices.models import Expense, Vendor, ExpenseApprovalStep
    from django.db.models import Sum, Count, Avg, Q

    # ─── 1. Determine Role ───
    is_vendor = hasattr(user, "vendor_profile") and user.vendor_profile is not None
    is_cfo = user.is_superuser
    grade = getattr(user, "employee_grade", 1)

    # ─── 2. Gather Scoped Context ───
    ctx = {"user_role": user.grade_label if not is_vendor else "Vendor"}

    # Base querysets
    expense_qs = Expense.objects.all()
    if is_vendor:
        expense_qs = expense_qs.filter(vendor=user.vendor_profile)
        ctx["vendor_name"] = user.vendor_profile.name
    elif grade < 3 and not is_cfo: # Employee or Dept Head (G1, G2)
        expense_qs = expense_qs.filter(submitted_by=user)

    # Total Outstanding
    ctx["total_outstanding"] = float(
        expense_qs.exclude(
            _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT"]
        ).aggregate(total=Sum("total_amount"))["total"] or 0
    )

    # Status Distribution
    status_dist = expense_qs.values("_status").annotate(
        count=Count("id"), amount=Sum("total_amount")
    )
    ctx["expense_status"] = [
        {"status": s["_status"], "count": s["count"], "amount": float(s["amount"] or 0)}
        for s in status_dist
    ]

    # Role-specific extras
    if is_cfo or grade >= 4:
        # Top vendors by spend
        top_vendors = (
            Expense.objects.filter(_status__in=["PAID", "APPROVED", "BOOKED_D365", "POSTED_D365"])
            .values("vendor__name")
            .annotate(total=Sum("total_amount"), count=Count("id"))
            .order_by("-total")[:5]
        )
        ctx["top_vendors"] = [
            {"vendor": v["vendor__name"], "total_spend": float(v["total"] or 0), "invoice_count": v["count"]}
            for v in top_vendors
        ]
        ctx["anomaly_count"] = Expense.objects.filter(anomaly_severity__in=["HIGH", "CRITICAL"]).count()
        
        # ─── Deep Budget Intelligence ───
        from apps.invoices.models import Budget
        budgets = Budget.objects.filter(status="active").select_related("department")
        ctx["budget_health"] = []
        for b in budgets:
            spent = float(b.spent_amount or 0)
            total = float(b.total_amount or 1)
            util = round((spent / total) * 100, 1)
            variance = total - spent
            status = "HEALTHY"
            if util >= 100: status = "OVER_BUDGET (CRITICAL)"
            elif util >= 90: status = "NEAR_LIMIT (WARNING)"
            
            ctx["budget_health"].append({
                "dept": b.department.name if b.department else b.name,
                "spent": spent,
                "total": total,
                "util_pct": util,
                "variance": variance,
                "status": status
            })
        
        # Treasury health
        ctx["treasury_index"] = 85 

    # Pending Queue (For everyone)
    ctx["pending_my_queue"] = ExpenseApprovalStep.objects.filter(
        assigned_to=user, status="PENDING"
    ).count()

    # ─── 3. Construct Prompts ───
    role_title = "CFO Copilot"
    if is_vendor: role_title = "Vendor Assistant"
    elif grade < 3 and not is_cfo: role_title = "Personal Expense Assistant"
    else: role_title = "Finance Intelligence Copilot"

    system_prompt = f"""You are FinanceAI's {role_title} — a pro-active financial intelligence agent.
You have access to the financial data context provided below.
You MUST provide answers based ONLY on this context. 
Your tone should be professional, data-driven, and highly detailed.
Format currency as ₹ with Indian numbering.

TOOLS & ACTIONS:
You can suggest actions the user can take. If the user asks to "do" something, check if it matches these actions:
- nav_to(screen): Suggest navigating to a screen (dashboard, ap-hub, expenses, anomaly, budget, reports, vendors).
- approve(ref_no): Suggest approving a specific bill.
- schedule(ref_no): Suggest scheduling a payment.
- remind(ref_no): Suggest sending a reminder to a vendor.
- scan(ref_no): Suggest running an anomaly scan.

IMPORTANT: You are restricted to the context of the current user: {ctx['user_role']}.
Return JSON with 'answer', 'insight', 'data_used', and an optional 'actions' list of objects like {{"label": "...", "type": "...", "payload": {{...}}}}."""

    user_prompt = f"""Financial Data Context:
{_format_context(ctx)}

User Question: {question}

Format your response as a valid JSON object."""

    try:
        response = call_text_model(prompt=user_prompt, system_prompt=system_prompt)
        import json
        content = response.get("content", "{}")
        # Clean JSON
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0:
            content = content[start:end]
        parsed = json.loads(content)
        parsed["context"] = ctx
        parsed["model"] = response.get("model", "")
        return parsed
    except Exception:
        return _rule_based_answer(question, ctx)


def _format_context(ctx: dict) -> str:
    lines = []
    lines.append(f"User Role: {ctx.get('user_role')}")
    if "vendor_name" in ctx:
        lines.append(f"Vendor Name: {ctx['vendor_name']}")

    lines.append(f"Total Outstanding: ₹{ctx['total_outstanding']:,.0f}")
    if "anomaly_count" in ctx:
        lines.append(f"System Anomalies (HIGH/CRITICAL): {ctx['anomaly_count']}")

    lines.append(f"Pending Items in Your Queue: {ctx['pending_my_queue']}")

    if "top_vendors" in ctx:
        lines.append("Top Vendors by Spend:")
        for v in ctx["top_vendors"]:
            lines.append(f"  - {v['vendor']}: ₹{v['total_spend']:,.0f} ({v['invoice_count']} inv)")
            
    if "budget_health" in ctx:
        lines.append("Budget Health (Active):")
        for b in ctx["budget_health"]:
            lines.append(f"  - {b['dept']}: {b['util_pct']}% used (₹{b['spent']:,.0f} of ₹{b['total']:,.0f})")
            
    if "treasury_index" in ctx:
        lines.append(f"Treasury Health Index: {ctx['treasury_index']}%")

    lines.append("Status Distribution:")
    for s in ctx["expense_status"]:
        lines.append(f"  - {s['status']}: {s['count']} items, ₹{s['amount']:,.0f}")

    return "\n".join(lines)



def _rule_based_answer(question: str, ctx: dict) -> dict:
    q = question.lower()
    role = ctx.get("user_role", "Finance User")

    # ── Greetings / identity questions ──────────────────────────────────────────
    greeting_words = ["hi", "hello", "hey", "who are you", "what are you", "what can you do", "help me", "help"]
    finance_words = ["audit", "budget", "vendor", "invoice", "payment", "expense", "anomaly", "cash", "outstanding", "pending", "queue"]
    if any(w in q for w in greeting_words) and not any(w in q for w in finance_words):
        answer = (
            f"Hello! I'm your {role} Copilot — an AI-powered finance intelligence assistant.\n\n"
            "I can help you with:\n"
            "• Outstanding invoices and payment status\n"
            "• Vendor spend analysis and top vendors\n"
            "• Budget utilization and alerts\n"
            "• Anomaly & fraud detection summary\n"
            "• Cash flow insights and treasury health\n\n"
            "I'm restricted to financial data only. What would you like to know?"
        )
        return {"answer": answer, "insight": "Ask me about vendors, invoices, budget, or anomalies for real-time insights.", "context": ctx}

    # ── Non-finance domain block ────────────────────────────────────────────────
    non_finance = ["weather", "news", "sports", "movie", "music", "food recipe", "travel plan", "joke", "poem", "programming", "history lesson", "science", "geography"]
    if any(w in q for w in non_finance):
        return {
            "answer": "I'm strictly a finance intelligence assistant. I can only answer questions about your financial data — invoices, vendors, budgets, expenses, and anomalies. Please ask me a finance-related question.",
            "insight": "Try: 'What are my top vendors?' or 'Show budget status' or 'Any anomalies?'",
            "context": ctx,
        }

    # ── Vendor / spend questions ────────────────────────────────────────────────
    if any(w in q for w in ["vendor", "supplier", "spend", "top vendor", "purchase", "procurement"]):
        vendors = ctx.get("top_vendors", [])[:5]
        if vendors:
            lines = "\n".join(f"{i+1}. {v['vendor']}: ₹{v['total_spend']:,.0f} ({v['invoice_count']} invoices)" for i, v in enumerate(vendors))
            answer = f"Top vendors by total spend:\n{lines}"
            insight = f"Your top vendor '{vendors[0]['vendor']}' accounts for ₹{vendors[0]['total_spend']:,.0f} in spend."
        else:
            answer = "No vendor spend data available for your access scope."
            insight = "Contact Finance Admin for vendor data access."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Budget questions ────────────────────────────────────────────────────────
    if any(w in q for w in ["budget", "over budget", "utilization", "guardrail", "limit", "dept budget", "department budget"]):
        budgets = ctx.get("budget_health", [])
        if budgets:
            critical = [b for b in budgets if "OVER_BUDGET" in b["status"]]
            warning = [b for b in budgets if "NEAR_LIMIT" in b["status"]]
            lines = "\n".join(f"• {b['dept']}: {b['util_pct']}% used (₹{b['spent']:,.0f} of ₹{b['total']:,.0f}) — {b['status']}" for b in budgets)
            answer = f"Budget Health Summary:\n{lines}"
            insight = f"{len(critical)} department(s) OVER budget, {len(warning)} near limit. Immediate action required: {', '.join(b['dept'] for b in critical) or 'None'}."
        else:
            answer = "No active budget data found. Please configure budgets in the Budgetary Guardrails module."
            insight = "Set up department budgets to enable this feature."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Anomaly / fraud / risk questions ────────────────────────────────────────
    if any(w in q for w in ["anomal", "fraud", "suspicious", "flag", "risk", "duplicate"]):
        count = ctx.get("anomaly_count", 0)
        answer = f"There are currently {count} HIGH/CRITICAL anomaly flag(s) in the system requiring immediate review.\n\nThese include duplicate invoices, inflated values, and abnormal patterns detected by the AI engine."
        insight = "Navigate to AI Fraud & Anomaly Engine to investigate and take action on flagged items."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Outstanding / payable / receivable questions ─────────────────────────────
    if any(w in q for w in ["outstanding", "payable", "receivable", "unpaid", "overdue", "due"]):
        total = ctx.get("total_outstanding", 0)
        queue = ctx.get("pending_my_queue", 0)
        dist = ctx.get("expense_status", [])
        overdue = next((s for s in dist if s["status"] in ("OVERDUE", "APPROVED")), None)
        answer = f"Total Outstanding Amount: ₹{total:,.0f}\nYour Pending Queue: {queue} items"
        if overdue:
            answer += f"\nApproved & Awaiting Payment: {overdue['count']} items (₹{overdue['amount']:,.0f})"
        insight = "Prioritize clearing overdue items to avoid late payment penalties and interest."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Pending queue / my tasks ────────────────────────────────────────────────
    if any(w in q for w in ["queue", "my task", "my approval", "my invoice", "my expense", "my reimbursement", "pending approval"]):
        queue = ctx.get("pending_my_queue", 0)
        answer = f"You have {queue} item(s) pending in your approval queue."
        if queue > 0:
            answer += "\nPlease review these promptly to avoid SLA breaches."
        insight = "Access the AP Hub or your dashboard to process pending items."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Audit / activity log ────────────────────────────────────────────────────
    if any(w in q for w in ["audit", "log", "activity", "history", "24h", "last 24", "audit log"]):
        anomaly_count = ctx.get("anomaly_count", 0)
        total = ctx.get("total_outstanding", 0)
        queue = ctx.get("pending_my_queue", 0)
        answer = (
            f"Audit Summary:\n"
            f"• Active Anomaly Flags (HIGH/CRITICAL): {anomaly_count}\n"
            f"• Total Outstanding: ₹{total:,.0f}\n"
            f"• Pending Approvals in Queue: {queue}\n\n"
            "For a full activity log, use Dashboard → Audit Sweep."
        )
        insight = "Regular audit log reviews help catch fraud patterns early."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Cash flow / treasury ────────────────────────────────────────────────────
    if any(w in q for w in ["cash", "cashflow", "cash flow", "forecast", "projection", "treasury"]):
        treasury = ctx.get("treasury_index", "N/A")
        outstanding = ctx.get("total_outstanding", 0)
        answer = f"Treasury Health Index: {treasury}%\nTotal Outstanding Payables: ₹{outstanding:,.0f}"
        insight = "Navigate to AI Intelligence → Cash Flow Forecasting for detailed 90-day projections."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Status distribution / overview ─────────────────────────────────────────
    if any(w in q for w in ["status", "distribution", "summary", "overview", "dashboard", "report"]):
        dist = ctx.get("expense_status", [])
        if dist:
            lines = "\n".join(f"• {s['status']}: {s['count']} items (₹{s['amount']:,.0f})" for s in dist)
            answer = f"Expense & Invoice Status Distribution:\n{lines}"
        else:
            answer = f"Total Outstanding: ₹{ctx.get('total_outstanding', 0):,.0f}"
        insight = "Visit the Dashboard for a complete visual breakdown of all financial metrics."
        return {"answer": answer, "insight": insight, "context": ctx}

    # ── Default: comprehensive financial summary ────────────────────────────────
    dist = ctx.get("expense_status", [])
    status_lines = "\n".join(f"  • {s['status']}: {s['count']} items (₹{s['amount']:,.0f})" for s in dist[:5])
    answer = (
        f"Financial Summary for {role}:\n"
        f"• Total Outstanding: ₹{ctx.get('total_outstanding', 0):,.0f}\n"
        f"• Anomalies (HIGH/CRITICAL): {ctx.get('anomaly_count', 'N/A')}\n"
        f"• Your Pending Queue: {ctx.get('pending_my_queue', 0)}\n"
        f"{'Status Breakdown:\n' + status_lines if status_lines else ''}\n\n"
        "I can answer questions about vendors, budgets, anomalies, cash flow, and outstanding invoices."
    )
    insight = "Ask me a specific question for deeper analysis — e.g. 'top vendors', 'budget status', or 'anomalies'."
    return {"answer": answer, "insight": insight, "context": ctx}

from django.contrib.auth.models import Group
from .auth_serializers import GroupSerializer

class GroupListView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

    def get(self, request):
        groups = Group.objects.all().order_by("name")
        return Response(GroupSerializer(groups, many=True).data)

    def post(self, request):
        name = request.data.get("name")
        if not name:
            return Response({"error": "Group name required."}, status=400)
        user_ids = request.data.get("user_ids") or []
        group, created = Group.objects.get_or_create(name=name.strip())
        if isinstance(user_ids, list) and user_ids:
            users = User.objects.filter(id__in=user_ids, is_active=True)
            group.user_set.set(users)
        return Response(GroupSerializer(group).data, status=201 if created else 200)


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

    def patch(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        name = (request.data.get("name") or "").strip()
        user_ids = request.data.get("user_ids")
        if name:
            group.name = name
            group.save(update_fields=["name"])
        if isinstance(user_ids, list):
            users = User.objects.filter(id__in=user_ids, is_active=True)
            group.user_set.set(users)
        return Response(GroupSerializer(group).data)


from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
import csv

class UserExportView(APIView):
    """
    GET /api/v1/auth/users/export/
    Admin-only endpoint to export users to CSV, with audit logging.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by("employee_grade", "username")
        
        # Log the export
        AuditLog.objects.create(
            user=request.user,
            action="system.user_export",
            entity_type="User",
            masked_after={"count": users.count(), "format": "CSV"}
        )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="users_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(["ID", "Username", "Email", "First Name", "Last Name", "Grade", "Department", "Is Active", "Is Vendor"])
        
        for user in users:
            dept = user.department.name if user.department else ""
            is_vendor = hasattr(user, "vendor_profile") and user.vendor_profile is not None
            writer.writerow([
                str(user.id), user.username, user.email, user.first_name, user.last_name,
                user.employee_grade, dept, user.is_active, is_vendor
            ])
            
        return response



class NotificationsView(APIView):
    """
    GET /api/v1/notifications/
    Returns role-appropriate, prioritised notifications for the current user.
    Sources: AuditLog, Expense.ocr_raw (escalations/schedules), ExpenseApprovalStep (pending queue).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from apps.invoices.models import Expense, ExpenseApprovalStep

        user = request.user
        grade = getattr(user, 'employee_grade', 1) or 1
        is_cfo = user.is_superuser or grade >= 5
        is_finance_admin = grade >= 4
        is_manager = grade >= 2
        since = timezone.now() - timedelta(hours=72)

        notifs = []
        seen = set()

        def add(nid, ntype, priority, title, message, timestamp, nav_target, dot='#F59E0B', amount=None, ref_no=None):
            if nid in seen:
                return
            seen.add(nid)
            notifs.append({
                'id': nid, 'type': ntype, 'priority': priority,
                'title': title, 'message': message,
                'timestamp': timestamp if isinstance(timestamp, str) else timestamp.isoformat(),
                'nav_target': nav_target, 'dot': dot,
                'amount': amount, 'ref_no': ref_no,
            })

        # ── 1. ESCALATED ANOMALIES → CFO and Finance Admin ────────────────
        if is_cfo or is_finance_admin:
            escalated_qs = Expense.objects.filter(
                anomaly_severity__in=['CRITICAL', 'HIGH'],
                updated_at__gte=since,
            ).order_by('-updated_at')[:20]
            for exp in escalated_qs:
                ocr = exp.ocr_raw or {}
                if 'escalated_by' not in ocr:
                    continue
                # Self-filter: check both username field and display name field
                by_uname = ocr.get('escalated_by_username') or ocr.get('escalated_by', '')
                if by_uname and (by_uname == user.username or by_uname == user.get_full_name()):
                    continue  # don't notify self
                add(
                    nid=f'escalate-{exp.id}',
                    ntype='ESCALATION',
                    priority='HIGH',
                    title='Anomaly Escalated to CFO',
                    message=f'{ocr["escalated_by"]} escalated {exp.ref_no} as CRITICAL — immediate review required',
                    timestamp=ocr.get('escalated_at', exp.updated_at.isoformat()),
                    nav_target='anomaly',
                    dot='#EF4444',
                    amount=float(exp.total_amount or 0),
                    ref_no=exp.ref_no,
                )

        # ── 2. PAYMENT SCHEDULED → CFO and Finance Admin ──────────────────
        if is_cfo or is_finance_admin:
            sched_qs = Expense.objects.filter(
                updated_at__gte=since,
            ).exclude(ocr_raw=None).order_by('-updated_at')[:50]
            for exp in sched_qs:
                ocr = exp.ocr_raw or {}
                if 'scheduled_payment_date' not in ocr:
                    continue
                if ocr.get('scheduled_by') == user.username:
                    continue
                add(
                    nid=f'sched-{exp.id}',
                    ntype='PAYMENT_SCHEDULED',
                    priority='MEDIUM',
                    title='Payment Scheduled',
                    message=f'{ocr.get("scheduled_by","Finance")} scheduled ₹{float(exp.total_amount or 0):,.0f} payment for {exp.ref_no} on {ocr.get("scheduled_payment_date","—")}',
                    timestamp=exp.updated_at.isoformat(),
                    nav_target='ai-hub',
                    dot='#F59E0B',
                    amount=float(exp.total_amount or 0),
                    ref_no=exp.ref_no,
                )

        # ── 3. PAYMENT SETTLED → Finance Admin and CFO ────────────────────
        if is_cfo or is_finance_admin:
            paid_qs = Expense.objects.filter(
                _status__in=['PAID', 'POSTED_D365'],
                updated_at__gte=since,
            ).exclude(ocr_raw=None).order_by('-updated_at')[:15]
            for exp in paid_qs:
                ocr = exp.ocr_raw or {}
                if ocr.get('paid_by') == user.username:
                    continue
                if 'paid_by' not in ocr:
                    continue
                add(
                    nid=f'paid-{exp.id}',
                    ntype='PAYMENT_DONE',
                    priority='LOW',
                    title='Payment Processed',
                    message=f'{exp.ref_no} settled via {ocr.get("payment_method","NEFT")} — ₹{float(exp.total_amount or 0):,.0f} by {ocr.get("paid_by","Finance")}',
                    timestamp=ocr.get('paid_at', exp.updated_at.isoformat()),
                    nav_target='ar',
                    dot='#10B981',
                    amount=float(exp.total_amount or 0),
                    ref_no=exp.ref_no,
                )

        # ── 4. ANOMALY MARKED SAFE → CFO and Finance Admin ────────────────
        if is_cfo or is_finance_admin:
            safe_qs = Expense.objects.filter(
                anomaly_severity='NONE',
                updated_at__gte=since,
            ).exclude(ocr_raw=None).order_by('-updated_at')[:10]
            for exp in safe_qs:
                ocr = exp.ocr_raw or {}
                if 'marked_safe_by' not in ocr:
                    continue
                if ocr.get('marked_safe_by') == user.username:
                    continue
                add(
                    nid=f'safe-{exp.id}',
                    ntype='ANOMALY_CLEARED',
                    priority='LOW',
                    title='Anomaly Cleared',
                    message=f'{ocr.get("marked_safe_by","Finance")} cleared anomaly on {exp.ref_no}: "{ocr.get("marked_safe_note","")[:60]}"',
                    timestamp=ocr.get('marked_safe_at', exp.updated_at.isoformat()),
                    nav_target='anomaly',
                    dot='#10B981',
                    ref_no=exp.ref_no,
                )

        # ── 5. PENDING APPROVALS IN USER'S QUEUE ──────────────────────────
        pending_steps = ExpenseApprovalStep.objects.filter(
            assigned_to=user,
            status='PENDING',
        ).select_related('expense', 'expense__submitted_by').order_by('-expense__created_at')[:15]
        for step in pending_steps:
            exp = step.expense
            submitter = exp.submitted_by.get_full_name() if exp.submitted_by else 'Employee'
            add(
                nid=f'approval-{step.id}',
                ntype='APPROVAL_NEEDED',
                priority='HIGH',
                title='Approval Required',
                message=f'{submitter} submitted {exp.ref_no} — ₹{float(exp.total_amount or 0):,.0f} — awaiting your approval (Level {step.level})',
                timestamp=exp.created_at.isoformat(),
                nav_target='ap-hub',
                dot='#F59E0B',
                amount=float(exp.total_amount or 0),
                ref_no=exp.ref_no,
            )

        # ── 6. MY EXPENSE STATUS CHANGES (for submitter) ──────────────────
        my_exps = Expense.objects.filter(
            submitted_by=user,
            updated_at__gte=since,
        ).exclude(_status__in=['SUBMITTED', 'PENDING_L1', 'PENDING_L2', 'PENDING_HOD',
                               'PENDING_FIN_L1', 'PENDING_FIN_L2', 'PENDING_FIN_HEAD', 'PENDING_CFO']).order_by('-updated_at')[:10]
        for exp in my_exps:
            status_map = {
                'APPROVED': ('Expense Approved', '✓ Your expense {ref} has been approved and will be reimbursed.', '#10B981', 'MEDIUM'),
                'PAID': ('Expense Paid', '✓ Your expense {ref} has been reimbursed — ₹{amt:,.0f} settled.', '#10B981', 'MEDIUM'),
                'REJECTED': ('Expense Rejected', '⚠ Your expense {ref} was rejected. Check notes in Expense Management.', '#EF4444', 'HIGH'),
                'QUERY_RAISED': ('Query on Your Expense', 'A query was raised on {ref} — please respond in the AP Hub.', '#F59E0B', 'HIGH'),
            }
            st = exp._status
            if st not in status_map:
                continue
            title, msg_tpl, dot, priority = status_map[st]
            msg = msg_tpl.format(ref=exp.ref_no or str(exp.id)[:8], amt=float(exp.total_amount or 0))
            add(
                nid=f'my-{exp.id}-{st}',
                ntype='MY_EXPENSE',
                priority=priority,
                title=title,
                message=msg,
                timestamp=exp.updated_at.isoformat(),
                nav_target='expenses',
                dot=dot,
                amount=float(exp.total_amount or 0),
                ref_no=exp.ref_no,
            )

        # ── 7. AUDIT LOG: recent key events not captured above ─────────────
        action_priority_map = {
            'anomaly.escalated': ('HIGH', '#EF4444', 'anomaly'),
            'anomaly.marked_safe': ('LOW', '#10B981', 'anomaly'),
            'invoice.payment_scheduled': ('MEDIUM', '#F59E0B', 'ai-hub'),
            'expense.submitted': ('MEDIUM', '#F59E0B', 'ap-hub'),
            'expense.approved': ('LOW', '#10B981', 'ap-hub'),
            'expense.rejected': ('MEDIUM', '#EF4444', 'ap-hub'),
        }
        visible_actions = list(action_priority_map.keys())
        audit_qs = AuditLog.objects.filter(
            action__in=visible_actions,
            created_at__gte=since,
        ).exclude(user=user).select_related('user').order_by('-created_at')[:30]
        for log in audit_qs:
            nid = f'audit-{log.id}'
            if nid in seen:
                continue
            action = log.action
            priority, dot, nav = action_priority_map.get(action, ('LOW', '#94A3B8', 'audit'))
            details = log.masked_after or {}
            actor = log.user.get_full_name() if log.user else 'System'
            ref = details.get('ref_no', str(log.entity_id)[:8] if log.entity_id else '')
            amt = details.get('amount', '')
            amt_str = f' — ₹{float(amt):,.0f}' if amt else ''

            # Role filtering: non-CFO should only see submissions/approvals relevant to them
            if not (is_cfo or is_finance_admin) and action in ('anomaly.escalated', 'invoice.payment_scheduled'):
                continue

            human_action = {
                'anomaly.escalated': 'escalated anomaly',
                'anomaly.marked_safe': 'cleared anomaly',
                'invoice.payment_scheduled': 'scheduled payment',
                'expense.submitted': 'submitted expense',
                'expense.approved': 'approved expense',
                'expense.rejected': 'rejected expense',
            }.get(action, action.replace('.', ' ').replace('_', ' '))

            add(
                nid=nid,
                ntype=action.upper().replace('.', '_'),
                priority=priority,
                title=human_action.title(),
                message=f'{actor} {human_action} {ref}{amt_str}',
                timestamp=log.created_at.isoformat(),
                nav_target=nav,
                dot=dot,
                ref_no=ref,
            )

        # Sort and deduplicate
        notifs.sort(key=lambda x: x['timestamp'], reverse=True)
        high_count = sum(1 for n in notifs if n['priority'] == 'HIGH')

        return Response({
            'notifications': notifs[:25],
            'unread_count': high_count,
            'total': len(notifs),
        })
