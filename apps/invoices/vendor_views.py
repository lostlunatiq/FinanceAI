from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsFinanceAdmin, IsFinanceManager
from .models import Vendor, Expense, ExpenseApprovalStep, STEP_TO_STATUS
from .vendor_serializers import (
    VendorOnboardSerializer,
    VendorDetailSerializer,
    VendorBillListSerializer,
    VendorBillDetailSerializer,
    DashboardStatsSerializer,
)


# ─── Vendor CRUD (Admin/Finance) ────────────────────────────────────────────


class VendorListView(APIView):
    """GET /api/v1/vendors/ — List all vendors (admin/finance)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendors = Vendor.objects.all().order_by("-created_at")

        # Optional filters
        status_filter = request.query_params.get("status")
        if status_filter:
            vendors = vendors.filter(status=status_filter)

        vendor_type = request.query_params.get("vendor_type")
        if vendor_type:
            vendors = vendors.filter(vendor_type=vendor_type)

        search = request.query_params.get("search")
        if search:
            vendors = vendors.filter(
                Q(name__icontains=search)
                | Q(gstin__icontains=search)
                | Q(email__icontains=search)
            )

        return Response(VendorDetailSerializer(vendors, many=True).data)


class VendorCreateView(APIView):
    """POST /api/v1/vendors/ — Create a new vendor."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VendorOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response(
            VendorDetailSerializer(vendor).data, status=status.HTTP_201_CREATED
        )


class VendorDetailView(APIView):
    """GET/PATCH /api/v1/vendors/<id>/ — Vendor detail."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        return Response(VendorDetailSerializer(vendor).data)

    def patch(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        serializer = VendorOnboardSerializer(vendor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(VendorDetailSerializer(vendor).data)


class VendorActivateView(APIView):
    """POST /api/v1/vendors/<id>/activate/ — Activate vendor."""

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request, pk):
        vendor = get_object_or_404(Vendor, pk=pk)
        action = request.data.get("action", "activate")

        if action == "activate":
            vendor.is_approved = True
            vendor.status = "ACTIVE"
        elif action == "suspend":
            vendor.status = "SUSPENDED"
        elif action == "blacklist":
            vendor.status = "BLACKLISTED"
        else:
            return Response(
                {"error": "Invalid action. Use: activate, suspend, blacklist"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vendor.save()
        return Response(VendorDetailSerializer(vendor).data)


# ─── Vendor Self-Service Portal ──────────────────────────────────────────────


class VendorProfileView(APIView):
    """GET /api/v1/vendor/profile/ — Vendor's own profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "vendor_profile"):
            return Response(
                {"error": "No vendor profile linked to this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        vendor = request.user.vendor_profile
        return Response(VendorDetailSerializer(vendor).data)


class VendorBillsView(APIView):
    """
    GET  /api/v1/vendor/bills/ — Vendor's submitted bills
    POST /api/v1/vendor/bills/ — Submit new bill
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if hasattr(request.user, "vendor_profile"):
            vendor = request.user.vendor_profile
            expenses = Expense.objects.filter(vendor=vendor).order_by("-created_at")
        else:
            # Employee view — show bills they submitted
            expenses = Expense.objects.filter(submitted_by=request.user).order_by(
                "-created_at"
            )

        # Optional status filter
        status_filter = request.query_params.get("status")
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(",")]
            expenses = expenses.filter(_status__in=statuses)

        return Response(VendorBillListSerializer(expenses, many=True).data)

    def post(self, request):
        from .serializers import ExpenseSubmitSerializer
        from .services import transition_expense, InvalidTransition

        serializer = ExpenseSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(submitted_by=request.user)

        # Transition DRAFT → SUBMITTED
        try:
            expense = transition_expense(expense, "SUBMITTED", request.user)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger OCR if invoice file present
        if expense.invoice_file:
            from .tasks import run_ocr_pipeline

            task = run_ocr_pipeline.delay(str(expense.id))
            expense.ocr_task_id = task.id
            expense.save(update_fields=["ocr_task_id"])

        return Response(
            VendorBillDetailSerializer(expense).data, status=status.HTTP_201_CREATED
        )


class VendorBillDetailView(APIView):
    """GET /api/v1/vendor/bills/<id>/ — Full bill detail with timeline."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        return Response(VendorBillDetailSerializer(expense).data)


class OCRExtractView(APIView):
    """
    POST /api/v1/vendor/bills/extract/ — Trigger OCR on a file
    Body: {"file_id": "uuid"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.invoices.models import FileRef
        from .tasks import run_ocr_standalone

        file_id = request.data.get("file_id")
        if not file_id:
            return Response(
                {"error": "file_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_ref = FileRef.objects.get(pk=file_id)
        except FileRef.DoesNotExist:
            return Response(
                {"error": "File not found."}, status=status.HTTP_404_NOT_FOUND
            )

        task = run_ocr_standalone.delay(str(file_ref.id))
        return Response(
            {"task_id": task.id, "status": "PENDING"},
            status=status.HTTP_202_ACCEPTED,
        )


class OCRResultView(APIView):
    """GET /api/v1/vendor/bills/extract/<task_id>/ — Poll OCR result."""

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
            return Response(
                {
                    "task_id": task_id,
                    "status": "COMPLETE",
                    "confidence": data.get("confidence", 0),
                    "extracted_fields": data.get("extracted_fields", {}),
                    "validation_errors": data.get("validation_errors", []),
                    "flagged_manual": data.get("flagged_manual", False),
                    "raw_text": data.get("raw_text", ""),
                }
            )
        else:
            return Response(
                {
                    "task_id": task_id,
                    "status": "FAILED",
                    "error": str(result.info) if result.info else "Unknown error",
                }
            )


# ─── Dashboard Stats ─────────────────────────────────────────────────────────


class DashboardStatsView(APIView):
    """GET /api/v1/dashboard/stats/ — Dashboard statistics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        base_qs = Expense.objects.all()

        # If vendor, scope to their bills
        if hasattr(request.user, "vendor_profile"):
            base_qs = base_qs.filter(vendor=request.user.vendor_profile)

        stats = {
            "total_pending": base_qs.filter(
                _status__in=[
                    "SUBMITTED",
                    "PENDING_L1",
                    "PENDING_L2",
                    "PENDING_HOD",
                    "PENDING_FIN_L1",
                    "PENDING_FIN_L2",
                    "PENDING_FIN_HEAD",
                ]
            ).count(),
            "total_approved": base_qs.filter(
                _status__in=["APPROVED", "PENDING_D365", "BOOKED_D365", "POSTED_D365"]
            ).count(),
            "total_rejected": base_qs.filter(
                _status__in=["REJECTED", "AUTO_REJECT"]
            ).count(),
            "total_paid": base_qs.filter(_status="PAID").count(),
            "total_outstanding_amount": float(
                base_qs.exclude(
                    _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT", "EXPIRED"]
                ).aggregate(total=Sum("total_amount"))["total"]
                or 0
            ),
            "my_queue_count": ExpenseApprovalStep.objects.filter(
                assigned_to=request.user, status="PENDING"
            ).count(),
            "anomaly_count": base_qs.filter(
                anomaly_severity__in=["HIGH", "CRITICAL"]
            ).count(),
        }

        return Response(stats)
