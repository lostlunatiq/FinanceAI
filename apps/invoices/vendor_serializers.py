from rest_framework import serializers
from .models import Vendor, Expense, ExpenseApprovalStep, ExpenseQuery


class VendorOnboardSerializer(serializers.ModelSerializer):
    """Used for vendor self-registration / admin creation."""

    class Meta:
        model = Vendor
        fields = [
            "name",
            "email",
            "phone",
            "gstin",
            "pan",
            "vendor_type",
            "msme_registered",
            "tds_section",
            "bank_account_name",
            "bank_account_number",
            "bank_ifsc",
        ]

    def validate_gstin(self, value):
        if value and len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters.")
        value = value.upper() if value else value
        qs = Vendor.objects.filter(gstin=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A vendor with this GSTIN already exists.")
        return value

    def validate_pan(self, value):
        if value and len(value) != 10:
            raise serializers.ValidationError("PAN must be exactly 10 characters.")
        return value.upper() if value else value


class VendorDetailSerializer(serializers.ModelSerializer):
    total_invoices = serializers.SerializerMethodField()
    total_spend = serializers.SerializerMethodField()
    pending_invoices = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "gstin",
            "pan",
            "is_approved",
            "status",
            "vendor_type",
            "avg_invoice_amount",
            "invoice_count",
            "msme_registered",
            "tds_section",
            "bank_account_name",
            "bank_account_number",
            "bank_ifsc",
            "created_at",
            "updated_at",
            "total_invoices",
            "total_spend",
            "pending_invoices",
        ]

    def get_total_invoices(self, obj):
        return obj.expenses.count()

    def get_total_spend(self, obj):
        from django.db.models import Sum

        result = obj.expenses.filter(_status="PAID").aggregate(
            total=Sum("total_amount")
        )
        return float(result["total"] or 0)

    def get_pending_invoices(self, obj):
        return obj.expenses.exclude(
            _status__in=["PAID", "REJECTED", "WITHDRAWN", "AUTO_REJECT", "EXPIRED"]
        ).count()


class VendorBillListSerializer(serializers.ModelSerializer):
    """Compact bill list for vendor dashboard."""

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    status = serializers.CharField(source="_status", read_only=True)
    anomaly_flags = serializers.SerializerMethodField()
    action_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "ref_no",
            "vendor_name",
            "invoice_number",
            "invoice_date",
            "total_amount",
            "pre_gst_amount",
            "cgst",
            "sgst",
            "igst",
            "business_purpose",
            "status",
            "current_step",
            "anomaly_severity",
            "ocr_confidence",
            "anomaly_flags",
            "action_permissions",
            "created_at",
            "submitted_at",
            "approved_at",
        ]

    def get_anomaly_flags(self, obj):
        if obj.ocr_raw and isinstance(obj.ocr_raw, dict):
            return obj.ocr_raw.get("anomaly_flags", [])
        return []

    def get_action_permissions(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return {}
        from .services import build_action_permissions

        return build_action_permissions(request.user, obj)


class ExpenseQuerySerializer(serializers.ModelSerializer):
    raised_by_name = serializers.SerializerMethodField()
    responded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseQuery
        fields = [
            "id", "raised_at_step", "question", "response",
            "ai_suggestion", "raised_by_name", "responded_by_name", "raised_at", "responded_at",
        ]

    def get_raised_by_name(self, obj):
        return obj.raised_by.get_full_name() if obj.raised_by else "System"

    def get_responded_by_name(self, obj):
        return obj.responded_by.get_full_name() if obj.responded_by else None


class VendorBillDetailSerializer(serializers.ModelSerializer):
    """Full bill detail with timeline and OCR data."""

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    vendor_gstin = serializers.CharField(source="vendor.gstin", read_only=True)
    submitted_by_name = serializers.CharField(
        source="submitted_by.get_full_name", read_only=True
    )
    status = serializers.CharField(source="_status", read_only=True)
    approval_steps = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    queries = serializers.SerializerMethodField()
    invoice_file_url = serializers.SerializerMethodField()
    action_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "ref_no",
            "vendor",
            "vendor_name",
            "vendor_gstin",
            "submitted_by",
            "submitted_by_name",
            "invoice_number",
            "invoice_date",
            "pre_gst_amount",
            "cgst",
            "sgst",
            "igst",
            "total_amount",
            "tds_section",
            "tds_amount",
            "business_purpose",
            "status",
            "current_step",
            "anomaly_severity",
            "ocr_raw",
            "ocr_confidence",
            "approval_steps",
            "timeline",
            "d365_document_no",
            "d365_posted_at",
            "d365_paid_at",
            "d365_payment_utr",
            "invoice_file",
            "invoice_file_url",
            "action_permissions",
            "created_at",
            "submitted_at",
            "approved_at",
            "queries",
        ]

    def get_invoice_file_url(self, obj):
        if obj.invoice_file_id:
            return f"/api/v1/files/{obj.invoice_file_id}/"
        return None

    def get_queries(self, obj):
        rows = (
            obj.queries.select_related("raised_by", "responded_by")
            .order_by("raised_at")
            .values(
                "id",
                "raised_at_step",
                "question",
                "response",
                "raised_at",
                "responded_at",
                "raised_by__first_name",
                "raised_by__last_name",
                "raised_by__username",
                "responded_by__first_name",
                "responded_by__last_name",
                "responded_by__username",
            )
        )
        data = []
        for row in rows:
            raised_name = " ".join(
                part for part in [row.get("raised_by__first_name"), row.get("raised_by__last_name")] if part
            ).strip() or row.get("raised_by__username") or "System"
            responded_name = " ".join(
                part for part in [row.get("responded_by__first_name"), row.get("responded_by__last_name")] if part
            ).strip() or row.get("responded_by__username") or None
            data.append(
                {
                    "id": row["id"],
                    "raised_at_step": row["raised_at_step"],
                    "question": row["question"],
                    "response": row["response"],
                    "ai_suggestion": "",
                    "raised_by_name": raised_name,
                    "responded_by_name": responded_name,
                    "raised_at": row["raised_at"],
                    "responded_at": row["responded_at"],
                }
            )
        return data

    def get_action_permissions(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return {}
        from .services import build_action_permissions

        return build_action_permissions(request.user, obj)

    def get_approval_steps(self, obj):
        from .serializers import ExpenseApprovalStepSerializer
        from .services import normalize_approval_chain

        obj = normalize_approval_chain(obj)
        steps = obj.approval_steps.all().order_by("level")
        return ExpenseApprovalStepSerializer(steps, many=True).data

    def get_timeline(self, obj):
        """Build a visual timeline from approval steps + status."""
        from apps.core.models import AuditLog

        events = AuditLog.objects.filter(
            entity_type="Expense", entity_id=obj.id
        ).order_by("created_at")

        timeline = []
        for event in events:
            timeline.append(
                {
                    "action": event.action,
                    "timestamp": event.created_at.isoformat(),
                    "actor": event.user.get_full_name() if event.user else "System",
                    "details": event.masked_after or {},
                }
            )
        return timeline


class OCRResultSerializer(serializers.Serializer):
    """OCR extraction results returned to frontend."""

    task_id = serializers.CharField()
    status = serializers.ChoiceField(choices=["PENDING", "PROCESSING", "COMPLETE", "FAILED"])
    confidence = serializers.FloatField(required=False)
    extracted_fields = serializers.DictField(required=False)
    validation_errors = serializers.ListField(child=serializers.CharField(), required=False)
    flagged_manual = serializers.BooleanField(required=False)
    raw_text = serializers.CharField(required=False)


class DashboardStatsSerializer(serializers.Serializer):
    """Dashboard statistics."""

    total_pending = serializers.IntegerField()
    total_approved = serializers.IntegerField()
    total_rejected = serializers.IntegerField()
    total_paid = serializers.IntegerField()
    total_outstanding_amount = serializers.FloatField()
    my_queue_count = serializers.IntegerField()
    anomaly_count = serializers.IntegerField()
