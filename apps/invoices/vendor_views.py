from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import (
    IsFinanceAdmin,
    IsFinanceOrAdmin,
    IsInternalUser,
    IsVendorOnly,
    CanViewExpense,
)
from .models import Vendor, Expense, ExpenseApprovalStep
from .vendor_serializers import (
    VendorOnboardSerializer,
    VendorDetailSerializer,
    VendorBillListSerializer,
    VendorBillDetailSerializer,
    DashboardStatsSerializer,
)


# ── Vendor CRUD (Finance / Admin only) ────────────────────────────────────────

class VendorListView(APIView):
    """GET /api/v1/invoices/vendors/ — List all vendors. Finance team only."""
    permission_classes = [IsAuthenticated, IsFinanceOrAdmin]

    def get(self, request):
        vendors = Vendor.objects.all().order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            vendors = vendors.filter(status=status_filter)

        vendor_type = request.query_params.get("vendor_type")
        if vendor_type:
            vendors = vendors.filter(vendor_type=vendor_type)

        # Safe search — ORM parameterisation prevents SQL injection;
        # length cap prevents ReDoS via long LIKE patterns.
        search = request.query_params.get("search", "")[:100]
        if search:
            vendors = vendors.filter(
                Q(name__icontains=search)
                | Q(gstin__icontains=search)
                | Q(email__icontains=search)
            )

        return Response(VendorDetailSerializer(vendors, many=True).data)


class VendorCreateView(APIView):
    """
    POST /api/v1/invoices/vendors/create/ — Onboard a new vendor.
    Finance admin only. Vendor portal user is created with a generated password
    sent via email — plain-text passwords are never accepted over the wire.
    """
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request):
        serializer = VendorOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        user_created = None
        create_user = request.data.get("create_portal_user", False)
        portal_username = request.data.get("portal_username", "").strip()

        if create_user and portal_username:
            from apps.core.models import User as UserModel
            import secrets, string

            if not UserModel.objects.filter(username=portal_username).exists():
                # Generate a strong random password; do NOT accept one from the request
                alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
                generated_password = "".join(secrets.choice(alphabet) for _ in range(16))

                portal_user = UserModel.objects.create(
                    username=portal_username,
                    email=vendor.email or f"{portal_username}@vendor.portal",
                    first_name=vendor.name.split()[0] if vendor.name else portal_username,
                    last_name=" ".join(vendor.name.split()[1:]) if len(vendor.name.split()) > 1 else "",
                    role="vendor",
                    is_active=True,
                )
                portal_user.set_password(generated_password)
                portal_user.save()
                vendor.user = portal_user
                vendor.save(update_fields=["user"])

                # TODO: send generated_password to vendor.email via secure email
                # For demo, the temporary password is returned ONCE in the response.
                user_created = {"username": portal_username, "temp_password": generated_password}

        data = VendorDetailSerializer(vendor).data
        if user_created:
            data["portal_user_created"] = user_created
        return Response(data, status=status.HTTP_201_CREATED)


class VendorDetailView(APIView):
    """
    GET  /api/v1/invoices/vendors/<id>/ — Vendor detail. Finance team.
    PATCH /api/v1/invoices/vendors/<id>/ — Update vendor fields. Finance admin only.
    """
    permission_classes = [IsAuthenticated, IsFinanceOrAdmin]

    def get(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        return Response(VendorDetailSerializer(vendor).data)

    def patch(self, request, pk):
        # PATCH requires finance_admin (stronger than GET)
        if request.user.role != "finance_admin":
            return Response(
                {"error": "Finance administrator access required for vendor updates."},
                status=status.HTTP_403_FORBIDDEN,
            )
        vendor = get_object_or_404(Vendor, pk=pk)
        serializer = VendorOnboardSerializer(vendor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(VendorDetailSerializer(vendor).data)


class VendorActivateView(APIView):
    """POST /api/v1/invoices/vendors/<id>/activate/ — Activate / suspend / blacklist vendor."""
    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        action = request.data.get("action", "")

        allowed_actions = {"activate", "suspend", "blacklist"}
        if action not in allowed_actions:
            return Response(
                {"error": f"Invalid action. Allowed: {', '.join(sorted(allowed_actions))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "activate":
            vendor.is_approved = True
            vendor.status = "ACTIVE"
        elif action == "suspend":
            vendor.status = "SUSPENDED"
        elif action == "blacklist":
            vendor.status = "BLACKLISTED"

        vendor.save()
        return Response(VendorDetailSerializer(vendor).data)


# ── Vendor Self-Service Portal ────────────────────────────────────────────────

class VendorProfileView(APIView):
    """GET /api/v1/invoices/vendor/profile/ — Vendor's own profile only."""
    permission_classes = [IsAuthenticated, IsVendorOnly]

    def get(self, request):
        if not hasattr(request.user, "vendor_profile"):
            return Response(
                {"error": "No vendor profile linked to this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(VendorDetailSerializer(request.user.vendor_profile).data)


class VendorBillsView(APIView):
    """
    GET  /api/v1/invoices/vendor/bills/ — Vendor's own submitted bills.
    POST /api/v1/invoices/vendor/bills/ — Submit a new bill.

    SECURITY: Vendors see ONLY their own bills. Employees see only their own
    submissions. Finance access to all bills goes via /invoices/finance/expenses/.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if hasattr(request.user, "vendor_profile"):
            # Vendor: own bills only
            vendor = request.user.vendor_profile
            expenses = Expense.objects.filter(vendor=vendor).order_by("-created_at")
        elif request.user.role in ("employee", "dept_head", "finance_manager", "finance_admin"):
            # Internal user: bills they personally submitted
            expenses = Expense.objects.filter(submitted_by=request.user).order_by("-created_at")
        else:
            return Response({"error": "Unauthorised."}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get("status", "")[:100]
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(",")]
            expenses = expenses.filter(_status__in=statuses)

        return Response(VendorBillListSerializer(expenses, many=True).data)

    def post(self, request):
        # Only vendors (or internal users filing on behalf) may submit bills
        if request.user.role not in ("vendor", "employee", "dept_head", "finance_manager", "finance_admin"):
            return Response({"error": "Unauthorised."}, status=status.HTTP_403_FORBIDDEN)

        from .serializers import ExpenseSubmitSerializer
        from .services import transition_expense, InvalidTransition

        serializer = ExpenseSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(submitted_by=request.user)

        try:
            expense = transition_expense(expense, "SUBMITTED", request.user)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if expense.invoice_file:
            from .tasks import run_ocr_pipeline
            task = run_ocr_pipeline.delay(str(expense.id))
            expense.ocr_task_id = task.id
            expense.save(update_fields=["ocr_task_id"])

        return Response(
            VendorBillDetailSerializer(expense).data, status=status.HTTP_201_CREATED
        )


class VendorBillDetailView(APIView):
    """
    GET /api/v1/invoices/vendor/bills/<id>/ — Full bill detail.
    SECURITY: CanViewExpense object-level check prevents cross-vendor access.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        can_view = CanViewExpense()
        if not can_view.has_object_permission(request, self, expense):
            return Response({"error": can_view.message}, status=status.HTTP_403_FORBIDDEN)
        return Response(VendorBillDetailSerializer(expense).data)


class OCRExtractView(APIView):
    """POST /api/v1/invoices/vendor/bills/extract/ — Trigger OCR on a file."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.invoices.models import FileRef
        from .tasks import run_ocr_standalone

        file_id = request.data.get("file_id")
        if not file_id:
            return Response({"error": "file_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_ref = FileRef.objects.get(pk=file_id)
        except FileRef.DoesNotExist:
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        # Vendors may only OCR files they uploaded themselves
        if request.user.role == "vendor" and file_ref.uploaded_by_id != request.user.id:
            return Response({"error": "You may only process your own files."}, status=status.HTTP_403_FORBIDDEN)

        task = run_ocr_standalone.delay(str(file_ref.id))
        return Response({"task_id": task.id, "status": "PENDING"}, status=status.HTTP_202_ACCEPTED)


class OCRResultView(APIView):
    """GET /api/v1/invoices/vendor/bills/extract/<task_id>/ — Poll OCR result."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        from celery.result import AsyncResult
        result = AsyncResult(task_id)

        if result.state == "PENDING":
            return Response({"task_id": task_id, "status": "PENDING"})
        elif result.state == "STARTED":
            return Response({"task_id": task_id, "status": "PROCESSING"})
        elif result.state == "SUCCESS":
            data = result.result or {}
            return Response({
                "task_id": task_id,
                "status": "COMPLETE",
                "confidence": data.get("confidence", 0),
                "extracted_fields": data.get("extracted_fields", {}),
                "validation_errors": data.get("validation_errors", []),
                "flagged_manual": data.get("flagged_manual", False),
                "raw_text": data.get("raw_text", ""),
            })
        else:
            return Response({
                "task_id": task_id,
                "status": "FAILED",
                "error": str(result.info) if result.info else "Unknown error",
            })


# ── Dashboard Stats ───────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """GET /api/v1/invoices/dashboard/stats/ — Dashboard statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base_qs = Expense.objects.all()

        # Vendors see only their own bills
        if hasattr(request.user, "vendor_profile"):
            base_qs = base_qs.filter(vendor=request.user.vendor_profile)
        elif request.user.role == "vendor":
            # vendor with no linked profile — return zeros
            base_qs = base_qs.none()

        stats = {
            "total_pending": base_qs.filter(
                _status__in=[
                    "SUBMITTED", "PENDING_L1", "PENDING_L2", "PENDING_HOD",
                    "PENDING_FIN_L1", "PENDING_FIN_L2", "PENDING_FIN_HEAD",
                ]
            ).count(),
            "total_approved": base_qs.filter(
                _status__in=["APPROVED", "PENDING_D365", "BOOKED_D365", "POSTED_D365"]
            ).count(),
            "total_rejected": base_qs.filter(_status__in=["REJECTED", "AUTO_REJECT"]).count(),
            "total_paid": base_qs.filter(_status="PAID").count(),
            "total_outstanding_amount": float(
                base_qs.exclude(
                    _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT", "EXPIRED"]
                ).aggregate(total=Sum("total_amount"))["total"] or 0
            ),
            "my_queue_count": ExpenseApprovalStep.objects.filter(
                assigned_to=request.user, status="PENDING"
            ).count(),
            "anomaly_count": base_qs.filter(anomaly_severity__in=["HIGH", "CRITICAL"]).count(),
        }

        return Response(stats)
