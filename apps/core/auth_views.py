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

    system_prompt = f"""You are FinanceAI's {role_title} — a strict financial intelligence engine.
You MUST provide answers based ONLY on the database context provided below.
DO NOT guess or use outside information. If the data is not in the context, say "I don't have that specific data in my records."
Always format currency as ₹ with Indian numbering (e.g., ₹1,42,500).
Your tone should be professional, data-driven, and highly detailed.
Explain the numbers you are providing.
IMPORTANT: You are restricted to the context of the current user: {ctx['user_role']}."""

    user_prompt = f"""Financial Data Context:
{_format_context(ctx)}

User Question: {question}

Provide a clear, direct answer. Include specific numbers from the data above.
Also provide a brief "insight" (one actionable observation based on the user's role).
Format your response as JSON:
{{"answer": "...", "insight": "...", "data_used": ["list of data points used"]}}"""

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
    if any(w in q for w in ["vendor", "supplier", "spend", "top"]):
        vendors = ctx.get("top_vendors", [])[:5]
        answer = "Top vendors by total spend:\n" + "\n".join(
            f"{i + 1}. {v['vendor']}: ₹{v['total_spend']:,.0f}" for i, v in enumerate(vendors)
        )
        insight = (
            f"Your top vendor accounts for ₹{vendors[0]['total_spend']:,.0f} in spend."
            if vendors
            else "No vendor data available."
        )
    elif any(w in q for w in ["outstanding", "pending", "due"]):
        answer = f"Total outstanding amount: ₹{ctx['total_outstanding']:,.0f}"
        insight = "Prioritize clearing the oldest pending invoices first."
    elif any(w in q for w in ["anomal", "fraud", "suspicious"]):
        answer = f"There are {ctx.get('anomaly_count', 'N/A')} HIGH/CRITICAL anomalies requiring review."
        insight = "Review flagged invoices immediately to prevent potential fraud."
    else:
        answer = f"Outstanding: ₹{ctx['total_outstanding']:,.0f} | Anomalies: {ctx.get('anomaly_count', 'N/A')} | Your queue: {ctx['pending_my_queue']}"
        insight = "Review the dashboard for full financial overview."
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
        group, created = Group.objects.get_or_create(name=name)
        return Response(GroupSerializer(group).data, status=201 if created else 200)
