from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404

from .auth_serializers import LoginSerializer, UserProfileSerializer, RegisterUserSerializer
from .permissions import IsFinanceAdmin
from .models import User, AuditLog


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["username"] = user.username
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access": str(refresh.access_token)})
        except Exception:
            return Response({"error": "Invalid or expired refresh token."}, status=status.HTTP_401_UNAUTHORIZED)


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
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response({'detail': 'old_password and new_password required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})


class RegisterView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class UserListView(APIView):
    """
    GET  /api/v1/auth/users/ — List all users (admin only)
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request):
        users = User.objects.all().order_by("role", "first_name")
        role_filter = request.query_params.get("role")
        if role_filter:
            users = users.filter(role=role_filter)
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return Response(UserProfileSerializer(users, many=True).data)


class UserDetailView(APIView):
    """
    GET   /api/v1/auth/users/<id>/ — User detail
    PATCH /api/v1/auth/users/<id>/ — Update user (role, active, etc.)
    DELETE /api/v1/auth/users/<id>/ — Deactivate user
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserProfileSerializer(user).data)

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        allowed_fields = {"role", "is_active", "first_name", "last_name", "email", "employee_grade", "department"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        # Handle password change
        if "password" in request.data:
            new_pass = request.data["password"]
            if len(new_pass) >= 6:
                user.set_password(new_pass)

        serializer = UserProfileSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if "password" in request.data:
            user.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.is_active = False
        user.save()
        return Response({"message": f"User {user.username} deactivated."})


class AuditLogListView(APIView):
    """
    GET /api/v1/audit/ — Paginated audit log
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 200)
        offset = int(request.query_params.get("offset", 0))
        entity_type = request.query_params.get("entity_type")
        action = request.query_params.get("action")
        user_id = request.query_params.get("user_id")

        qs = AuditLog.objects.select_related("user").order_by("-created_at")

        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if action:
            qs = qs.filter(action__icontains=action)
        if user_id:
            qs = qs.filter(user_id=user_id)

        total = qs.count()
        entries = qs[offset: offset + limit]

        results = []
        for entry in entries:
            results.append({
                "id": str(entry.id),
                "action": entry.action,
                "entity_type": entry.entity_type,
                "entity_id": str(entry.entity_id) if entry.entity_id else None,
                "actor": entry.user.get_full_name() if entry.user else "System",
                "actor_role": entry.user.role if entry.user else "system",
                "timestamp": entry.created_at.isoformat(),
                "details": entry.masked_after or {},
            })

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
            return Response({"error": str(e), "answer": "Unable to process query at this time."}, status=status.HTTP_200_OK)


def _run_nl_query(question: str, user) -> dict:
    """Run NL query using OpenRouter and real DB data."""
    from ai.tools.openrouter_client import call_text_model
    from apps.invoices.models import Expense, Vendor
    from django.db.models import Sum, Count, Avg, Q

    # Gather context data from DB
    ctx = {}

    # Top vendors by spend
    top_vendors = Expense.objects.filter(
        _status__in=["PAID", "APPROVED", "BOOKED_D365", "POSTED_D365"]
    ).values("vendor__name").annotate(
        total=Sum("total_amount"), count=Count("id")
    ).order_by("-total")[:10]
    ctx["top_vendors"] = [{"vendor": v["vendor__name"], "total_spend": float(v["total"] or 0), "invoice_count": v["count"]} for v in top_vendors]

    # Status distribution
    status_dist = Expense.objects.values("_status").annotate(count=Count("id"), amount=Sum("total_amount"))
    ctx["expense_status"] = [{"status": s["_status"], "count": s["count"], "amount": float(s["amount"] or 0)} for s in status_dist]

    # Anomaly stats
    ctx["anomaly_count"] = Expense.objects.filter(anomaly_severity__in=["HIGH", "CRITICAL"]).count()
    ctx["total_outstanding"] = float(Expense.objects.exclude(
        _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT"]
    ).aggregate(total=Sum("total_amount"))["total"] or 0)

    # Pending approvals
    from apps.invoices.models import ExpenseApprovalStep
    ctx["pending_my_queue"] = ExpenseApprovalStep.objects.filter(
        assigned_to=user, status="PENDING"
    ).count()

    system_prompt = """You are FinanceAI's CFO Copilot — an expert financial assistant.
You have access to real-time financial data. Answer questions concisely and accurately.
Always format currency as ₹ with Indian numbering (e.g., ₹1,42,500).
Be direct and actionable. If data is insufficient, say so clearly."""

    user_prompt = f"""Financial Data Context:
{_format_context(ctx)}

User Question: {question}

Provide a clear, direct answer. Include specific numbers from the data above.
Also provide a brief "insight" (one actionable observation).
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
        # Fallback: rule-based answer
        return _rule_based_answer(question, ctx)


def _format_context(ctx: dict) -> str:
    lines = []
    lines.append(f"Total Outstanding: ₹{ctx['total_outstanding']:,.0f}")
    lines.append(f"Anomalies (HIGH/CRITICAL): {ctx['anomaly_count']}")
    lines.append(f"Your Pending Queue: {ctx['pending_my_queue']} items")
    lines.append("Top Vendors by Spend:")
    for v in ctx["top_vendors"][:5]:
        lines.append(f"  - {v['vendor']}: ₹{v['total_spend']:,.0f} ({v['invoice_count']} invoices)")
    lines.append("Expense Status Distribution:")
    for s in ctx["expense_status"]:
        lines.append(f"  - {s['status']}: {s['count']} items, ₹{s['amount']:,.0f}")
    return "\n".join(lines)


def _rule_based_answer(question: str, ctx: dict) -> dict:
    q = question.lower()
    if any(w in q for w in ["vendor", "supplier", "spend", "top"]):
        vendors = ctx["top_vendors"][:5]
        answer = "Top vendors by total spend:\n" + "\n".join(
            f"{i+1}. {v['vendor']}: ₹{v['total_spend']:,.0f}" for i, v in enumerate(vendors)
        )
        insight = f"Your top vendor accounts for ₹{vendors[0]['total_spend']:,.0f} in spend." if vendors else "No vendor data available."
    elif any(w in q for w in ["outstanding", "pending", "due"]):
        answer = f"Total outstanding amount: ₹{ctx['total_outstanding']:,.0f}"
        insight = "Prioritize clearing the oldest pending invoices first."
    elif any(w in q for w in ["anomal", "fraud", "suspicious"]):
        answer = f"There are {ctx['anomaly_count']} HIGH/CRITICAL anomalies requiring review."
        insight = "Review flagged invoices immediately to prevent potential fraud."
    else:
        answer = f"Outstanding: ₹{ctx['total_outstanding']:,.0f} | Anomalies: {ctx['anomaly_count']} | Your queue: {ctx['pending_my_queue']}"
        insight = "Review the dashboard for full financial overview."
    return {"answer": answer, "insight": insight, "context": ctx}
