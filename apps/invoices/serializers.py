from rest_framework import serializers
from .models import Expense, Vendor, ExpenseApprovalStep, ExpenseQuery


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "vendor_type", "is_approved", "gstin"]


class ExpenseSubmitSerializer(serializers.ModelSerializer):
    """Used for vendor self-service submission and L1 file-on-behalf."""

    class Meta:
        model = Expense
        fields = [
            "vendor",
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
            "invoice_file",
            "filed_on_behalf",
            "filer_on_behalf",
        ]

    def validate_business_purpose(self, value):
        if value and len(value.strip()) < 5:
            raise serializers.ValidationError("Business purpose must be at least 5 characters.")
        return value

    def validate(self, data):
        vendor = data.get("vendor")
        if vendor and not vendor.is_approved:
            raise serializers.ValidationError(
                f"Vendor '{vendor.name}' is not approved. Contact admin."
            )
        if data.get("filed_on_behalf") and not data.get("filer_on_behalf"):
            raise serializers.ValidationError(
                "filer_on_behalf is required when filed_on_behalf is True."
            )
        return data


class ExpenseApprovalStepSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    actual_actor_name = serializers.CharField(source="actual_actor.get_full_name", read_only=True)

    class Meta:
        model = ExpenseApprovalStep
        fields = [
            "id",
            "level",
            "grade_required",
            "assigned_to",
            "assigned_to_name",
            "actual_actor",
            "actual_actor_name",
            "status",
            "sla_due_at",
            "decided_at",
            "decision_reason",
        ]


class ExpenseDetailSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    approval_steps = ExpenseApprovalStepSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by.get_full_name", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "ref_no",
            "vendor",
            "submitted_by",
            "submitted_by_name",
            "filed_on_behalf",
            "filer_on_behalf",
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
            "approval_steps",
            "d365_document_no",
            "d365_posted_at",
            "d365_paid_at",
            "d365_payment_utr",
            "created_at",
            "submitted_at",
            "approved_at",
        ]


class ApprovalActionSerializer(serializers.Serializer):
    """For approve/reject actions by approvers."""

    decision = serializers.ChoiceField(choices=["APPROVED", "REJECTED", "QUERY_RAISED"])
    reason = serializers.CharField(required=False, allow_blank=True)
    anomaly_override_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        expense = self.context.get("expense")
        if (
            expense
            and expense.anomaly_severity in ("HIGH", "CRITICAL")
            and data["decision"] == "APPROVED"
            and not data.get("anomaly_override_reason")
        ):
            raise serializers.ValidationError(
                "anomaly_override_reason is required for HIGH/CRITICAL anomaly approvals."
            )
        return data
