
from django.core.exceptions import PermissionDenied
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasMinimumGrade


class PurchaseOrdersView(APIView):
    """
    Finance-only API endpoint to list cached Purchase Orders with their lines.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only allow Finance users or admins
        if not (request.user.is_superuser or HasMinimumGrade.make(4)(request)):
            raise PermissionDenied("Access denied: Finance users only")

        # Import here to avoid circular imports during app initialization
        from apps.d365.models import D365PurchaseOrder

        orders = D365PurchaseOrder.objects.prefetch_related('lines').all()

        data = []
        for order in orders:
            order_data = {
                "bc_document_no": order.bc_document_no,
                "bc_document_type": order.bc_document_type,
                "vendor_no": order.vendor_no,
                "location_code": order.location_code,
                "posting_date": order.posting_date.isoformat() if order.posting_date else None,
                "document_date": order.document_date.isoformat() if order.document_date else None,
                "due_date": order.due_date.isoformat() if order.due_date else None,
                "service_month": order.service_month.isoformat() if order.service_month else None,
                "payment_terms": order.payment_terms,
                "project": order.project,
                "project_location": order.project_location,
                "vendor_invoice_no": order.vendor_invoice_no,
                "synced_at": order.synced_at.isoformat() if order.synced_at else None,
                "is_open": order.is_open,
                "lines": []
            }

            for line in order.lines.all():
                line_data = {
                    "bc_line_no": line.bc_line_no,
                    "line_type": line.line_type,
                    "account_no": line.account_no,
                    "description": line.description,
                    "quantity": str(line.quantity) if line.quantity else None,
                    "unit_cost": str(line.unit_cost) if line.unit_cost else None,
                    "gst_group_code": line.gst_group_code,
                    "hsn_sac": line.hsn_sac,
                    "gst_jurisdiction_type": line.gst_jurisdiction_type,
                    "gst_credit": line.gst_credit,
                    "project": line.project,
                    "project_location": line.project_location,
                }
                order_data["lines"].append(line_data)

            data.append(order_data)

        return Response({"orders": data})


class InvoiceRetryView(APIView):
    """
    Finance-only API endpoint to retry pushing an invoice to D365.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, expense_id):
        # Only allow Finance users or admins
        if not (request.user.is_superuser or HasMinimumGrade.make(4)(request)):
            raise PermissionDenied("Access denied: Finance users only")

        # Import here to avoid circular imports during app initialization
        from apps.invoices.models import Expense

        try:
            expense = Expense.objects.get(id=expense_id)

            # Only retry if expense is still in PENDING_D365 state
            if expense.status != "PENDING_D365":
                return Response({
                    "error": "Expense is not in PENDING_D365 state"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Re-queue the task
            from apps.d365.tasks import push_invoice_to_d365
            push_invoice_to_d365.delay(str(expense.id))

            return Response({
                "message": "Retry queued successfully"
            })

        except Expense.DoesNotExist:
            return Response({
                "error": "Expense not found"
            }, status=status.HTTP_404_NOT_FOUND)
