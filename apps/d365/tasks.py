import logging

from celery import shared_task
from django.utils import timezone

from apps.core.models import Vendor
from apps.d365.client import D365Client
from apps.d365.models import D365PurchaseLine, D365PurchaseOrder
from apps.invoices.models import Expense

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_purchase_orders(self):
    """
    Celery beat task to sync open Purchase Orders from D365.
    Runs every 30 minutes.
    """
    try:
        client = D365Client()
        logger.info("Starting D365 purchase order sync")

        # Get all open Purchase Headers (Document Type=2)
        headers = client.get_purchase_orders()

        # Track which documents we've seen to identify closed ones
        seen_document_nos = set()

        for header in headers:
            document_no = header["No"]
            seen_document_nos.add(document_no)

            # Get the lines for this header
            lines = client.get_purchase_lines(document_no)

            # Create or update the Purchase Order
            po, created = D365PurchaseOrder.objects.update_or_create(
                bc_document_no=document_no,
                defaults={
                    "bc_document_type": header["Document_Type"],
                    "vendor_no": header["Buy_from_Vendor_No"],
                    "location_code": header.get("Location_Code", ""),
                    "posting_date": header["Posting_Date"],
                    "document_date": header["Document_Date"],
                    "due_date": header.get("Due_Date"),
                    "service_month": header.get("Service_Month"),
                    "payment_terms": header.get("Payment_Terms_Code", ""),
                    "project": header.get("Project", ""),
                    "project_location": header.get("Project_Location", ""),
                    "vendor_invoice_no": header.get("Vendor_Invoice_No", ""),
                    "synced_at": timezone.now(),
                    "is_open": True,  # Always true for open orders
                }
            )

            # Update vendor relationship if possible
            vendor = Vendor.objects.filter(bc_vendor_no=header["Buy_from_Vendor_No"]).first()
            if vendor:
                po.vendor = vendor
                po.save(update_fields=["vendor"])

            # Create or update lines
            for line in lines:
                D365PurchaseLine.objects.update_or_create(
                    purchase_order=po,
                    bc_line_no=line["Line_No"],
                    defaults={
                        "line_type": line.get("Type", ""),
                        "account_no": line.get("No", ""),
                        "description": line.get("Description", ""),
                        "quantity": line.get("Quantity"),
                        "unit_cost": line.get("Direct_Unit_Cost"),
                        "gst_group_code": line.get("GST_Group_Code", ""),
                        "hsn_sac": line.get("HSN_SAC_Code", ""),
                        "gst_jurisdiction_type": line.get("GST_Jurisdiction_Type", ""),
                        "gst_credit": line.get("GST_Credit", ""),
                        "project": line.get("Project", ""),
                        "project_location": line.get("Project_Location", ""),
                    }
                )

        # Mark orders as closed if they're no longer returned by the API
        D365PurchaseOrder.objects.exclude(bc_document_no__in=seen_document_nos).update(is_open=False)

        logger.info(f"Completed D365 purchase order sync with {len(headers)} orders")

    except Exception as exc:
        logger.exception("Failed to sync purchase orders from D365")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def push_invoice_to_d365(self, expense_id: str):
    """
    Celery task to push approved invoice to D365 as Purchase Invoice.
    Called from transition_expense when expense status changes to APPROVED.
    """
    try:
        # Load expense and related objects
        expense = Expense.objects.select_related("vendor").get(id=expense_id)

        # Check if already pushed to D365
        if expense.d365_document_no:
            logger.info(f"Expense {expense_id} already pushed to D365")
            return

        # Validate vendor has BC vendor number
        if not expense.vendor.bc_vendor_no:
            raise ValueError("Vendor does not have a BC vendor number")

        # Transition to PENDING_D365 first to prevent duplicate pushes
        from apps.invoices.services import transition_expense
        transition_expense(expense, "PENDING_D365", None, skip_sod=True)

        # Build payload for Purchase Header
        header_payload = {
            "Document_Type": 2,  # Purchase Invoice
            "Buy_from_Vendor_No": expense.vendor.bc_vendor_no,
            "Vendor_Invoice_No": expense.invoice_number,
            "Document_Date": expense.invoice_date.isoformat() if expense.invoice_date else timezone.now().date().isoformat(),
            "Posting_Date": timezone.now().date().isoformat(),
            "Due_Date": expense.ocr_raw.get("due_date", "") if expense.ocr_raw else "",
            "Location_Code": expense.ocr_raw.get("location_code", "") if expense.ocr_raw else "",
            "Payment_Terms_Code": expense.ocr_raw.get("payment_terms", "") if expense.ocr_raw else "",
        }

        # Create the header in D365
        client = D365Client()
        response = client.create_purchase_header(header_payload)

        # Extract the document number from the response
        document_no = response["No"]

        # Build line payloads from OCR data
        lines_payload = []
        if expense.ocr_raw and "line_items" in expense.ocr_raw:
            for idx, item in enumerate(expense.ocr_raw["line_items"]):
                line = {
                    "Document_Type": 2,  # Purchase Invoice
                    "Line_No": 10000 + (idx * 10000),  # Line numbers
                    "Type": "G/L Account",
                    "No": item.get("account_no", ""),
                    "Description": item.get("description", expense.business_purpose),
                    "Quantity": 1,
                    "Direct_Unit_Cost": float(expense.pre_gst_amount),
                    "GST_Group_Code": item.get("gst_group_code", ""),
                    "HSN_SAC_Code": item.get("hsn_sac", ""),
                }
                lines_payload.append(line)
        else:
            # Fallback to single line if no OCR line items
            line = {
                "Document_Type": 2,  # Purchase Invoice
                "Line_No": 10000,
                "Type": "G/L Account",
                "No": "",
                "Description": expense.business_purpose,
                "Quantity": 1,
                "Direct_Unit_Cost": float(expense.pre_gst_amount),
                "GST_Group_Code": expense.ocr_raw.get("gst_group_code", "") if expense.ocr_raw else "",
                "HSN_SAC_Code": expense.ocr_raw.get("hsn_sac", "") if expense.ocr_raw else "",
            }
            lines_payload.append(line)

        # Create lines in D365
        client.create_purchase_lines(document_no, lines_payload)

        # Update expense with D365 info and transition to BOOKED_D365
        expense.d365_document_no = document_no
        expense.d365_posted_at = timezone.now()
        expense.save(update_fields=["d365_document_no", "d365_posted_at"])

        # Transition to BOOKED_D365
        transition_expense(expense, "BOOKED_D365", None, skip_sod=True)

        logger.info(f"Successfully pushed expense {expense_id} to D365 as document {document_no}")

    except Exception as exc:
        logger.exception(f"Failed to push expense {expense_id} to D365")

        # Update expense with error
        try:
            expense = Expense.objects.get(id=expense_id)
            if hasattr(exc, 'message'):
                error_msg = exc.message
            else:
                error_msg = str(exc)
            expense.d365_push_error = error_msg
            expense.save(update_fields=["d365_push_error"])

            # If we've exhausted retries, transition to a terminal state to prevent hanging
            if self.request.retries >= self.max_retries:
                # Transition to a terminal state to indicate failure
                transition_expense(expense, "APPROVED", None, skip_sod=True)
                logger.warning(f"Expense {expense_id} exhausted all retries and marked as APPROVED with error: {error_msg}")
        except Exception:
            # If we can't update the expense, log and continue
            logger.error(f"Could not update expense {expense_id} with error: {exc}")

        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
