from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasMinimumGrade
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
                Q(name__icontains=search) | Q(gstin__icontains=search) | Q(email__icontains=search)
            )

        return Response(VendorDetailSerializer(vendors, many=True).data)


class VendorCreateView(APIView):
    """POST /api/v1/vendors/create/ — Create vendor + optionally create linked user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VendorOnboardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        # Optionally create a linked portal user account
        create_user = request.data.get("create_portal_user", False)
        portal_username = request.data.get("portal_username", "")
        portal_password = request.data.get("portal_password", "")

        user_created = None
        if create_user and portal_username and portal_password:
            from apps.core.models import User as UserModel

            if not UserModel.objects.filter(username=portal_username).exists():
                portal_user = UserModel.objects.create(
                    username=portal_username,
                    email=vendor.email or f"{portal_username}@vendor.portal",
                    first_name=vendor.name.split()[0] if vendor.name else portal_username,
                    last_name=" ".join(vendor.name.split()[1:])
                    if len(vendor.name.split()) > 1
                    else "",
                    role="vendor",
                    is_active=True,
                )
                portal_user.set_password(portal_password)
                portal_user.save()
                vendor.user = portal_user
                vendor.save(update_fields=["user"])
                user_created = portal_username

        data = VendorDetailSerializer(vendor).data
        if user_created:
            data["portal_user_created"] = user_created
        return Response(data, status=status.HTTP_201_CREATED)


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

    permission_classes = [IsAuthenticated, HasMinimumGrade.make(4)]

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
            expenses = Expense.objects.filter(submitted_by=request.user).order_by("-created_at")

        # Optional status filter
        status_filter = request.query_params.get("status")
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(",")]
            expenses = expenses.filter(_status__in=statuses)

        return Response(VendorBillListSerializer(expenses, many=True).data)

    def post(self, request):
        from .serializers import ExpenseSubmitSerializer
        from .services import transition_expense, InvalidTransition

        # Resolve vendor: from logged-in user's vendor_profile, or explicit vendor field
        data = request.data.copy()
        if not data.get("vendor"):
            if hasattr(request.user, "vendor_profile"):
                data["vendor"] = str(request.user.vendor_profile.id)
            else:
                return Response(
                    {
                        "error": "No vendor profile linked. Provide vendor ID or link a vendor to your account."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Compute pre_gst_amount if not provided
        if not data.get("pre_gst_amount"):
            total = float(data.get("total_amount") or 0)
            cgst = float(data.get("cgst") or 0)
            sgst = float(data.get("sgst") or 0)
            igst = float(data.get("igst") or 0)
            data["pre_gst_amount"] = str(round(total - cgst - sgst - igst, 2))

        serializer = ExpenseSubmitSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save(submitted_by=request.user)

        # Transition DRAFT → SUBMITTED
        try:
            expense = transition_expense(expense, "SUBMITTED", request.user)
        except InvalidTransition as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-advance SUBMITTED → PENDING_L1 and create first approval step
        try:
            from .services import STATUS_TO_NEXT_STATUS, create_initial_approval_step

            expense = transition_expense(
                expense, "PENDING_L1", request.user, "Auto-started approval", skip_sod=True
            )
            create_initial_approval_step(expense)
        except Exception:
            pass  # Non-critical

        # Trigger OCR if invoice file present
        if expense.invoice_file:
            from .tasks import run_ocr_pipeline

            task = run_ocr_pipeline.delay(str(expense.id))
            expense.ocr_task_id = task.id
            expense.save(update_fields=["ocr_task_id"])

        # Run anomaly scan immediately (sync in dev, async in prod)
        try:
            from ai.pipelines.anomaly_pipeline import run_anomaly_checks

            result = run_anomaly_checks(expense)
            expense.anomaly_severity = result["severity"]
            flags = result.get("flags", [])
            ocr_raw = expense.ocr_raw or {}
            ocr_raw["anomaly_flags"] = flags
            expense.ocr_raw = ocr_raw
            expense.save(update_fields=["anomaly_severity", "ocr_raw"])
        except Exception:
            pass  # Non-critical — don't block submission

        return Response(VendorBillDetailSerializer(expense).data, status=status.HTTP_201_CREATED)


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
            return Response({"error": "file_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_ref = FileRef.objects.get(pk=file_id)
        except FileRef.DoesNotExist:
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

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
            "total_rejected": base_qs.filter(_status__in=["REJECTED", "AUTO_REJECT"]).count(),
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
            "anomaly_count": base_qs.filter(anomaly_severity__in=["HIGH", "CRITICAL"]).count(),
        }

        return Response(stats)
