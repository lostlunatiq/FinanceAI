"""
Celery tasks for invoice processing.
Handles OCR extraction and anomaly detection as background jobs.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue="ocr", max_retries=2, default_retry_delay=30)
def run_ocr_pipeline(self, expense_id: str):
    """
    Run OCR on an expense's invoice file.
    Extracts data and saves to the expense record.
    """
    from apps.invoices.models import Expense

    try:
        expense = Expense.objects.select_related("invoice_file", "vendor").get(
            pk=expense_id
        )
    except Expense.DoesNotExist:
        logger.error(f"Expense {expense_id} not found")
        return {"error": "Expense not found"}

    if not expense.invoice_file:
        logger.warning(f"Expense {expense_id} has no invoice file")
        return {"error": "No invoice file attached"}

    try:
        from ai.pipelines.ocr_pipeline import run as run_ocr

        result = run_ocr(expense.invoice_file.path, process_all_pages=True)

        # Save OCR results to expense
        expense.ocr_raw = {
            "extracted_fields": result.extracted_fields,
            "raw_text": result.raw_text,
            "model_used": result.model_used,
            "pages_processed": result.pages_processed,
            "c1": result.c1,
            "c2": result.c2,
            "c3": result.c3,
            "validation_errors": result.validation_errors,
        }
        expense.ocr_confidence = result.confidence

        # Pre-fill expense fields from OCR if confidence is high enough
        from django.conf import settings

        auto_threshold = getattr(settings, "OCR_CONFIDENCE_AUTO_ACCEPT", 0.85)
        review_threshold = getattr(settings, "OCR_CONFIDENCE_REVIEW", 0.50)

        if result.confidence >= review_threshold:
            fields = result.extracted_fields
            # Multi-invoice PDF: find the matching invoice by number, or use first
            if fields.get("multi_invoice") and fields.get("invoices"):
                invoices = fields["invoices"]
                matched = next(
                    (inv for inv in invoices if inv.get("invoice_number") == expense.invoice_number),
                    invoices[0],
                )
                fields = matched

            if fields.get("invoice_number") and not expense.invoice_number:
                expense.invoice_number = fields["invoice_number"]
            if fields.get("invoice_date") and not expense.invoice_date:
                from datetime import date

                try:
                    expense.invoice_date = date.fromisoformat(fields["invoice_date"])
                except (ValueError, TypeError):
                    pass
            if fields.get("total_amount") and not expense.total_amount:
                from decimal import Decimal

                try:
                    expense.total_amount = Decimal(str(fields["total_amount"]))
                except Exception:
                    pass
            if fields.get("pre_gst_amount") and not expense.pre_gst_amount:
                try:
                    expense.pre_gst_amount = Decimal(str(fields["pre_gst_amount"]))
                except Exception:
                    pass
            if fields.get("cgst"):
                try:
                    expense.cgst = Decimal(str(fields["cgst"]))
                except Exception:
                    pass
            if fields.get("sgst"):
                try:
                    expense.sgst = Decimal(str(fields["sgst"]))
                except Exception:
                    pass
            if fields.get("igst"):
                try:
                    expense.igst = Decimal(str(fields["igst"]))
                except Exception:
                    pass

        expense.save()

        # Trigger anomaly detection
        run_anomaly_pipeline.delay(expense_id)

        return {
            "success": result.success,
            "confidence": result.confidence,
            "extracted_fields": result.extracted_fields,
            "validation_errors": result.validation_errors,
            "flagged_manual": result.flagged_manual,
            "raw_text": result.raw_text,
        }

    except Exception as e:
        logger.error(f"OCR pipeline failed for {expense_id}: {e}", exc_info=True)
        self.retry(exc=e)


@shared_task(bind=True, queue="ocr", max_retries=1)
def run_ocr_standalone(self, file_id: str):
    """
    Run OCR on a standalone file (before expense creation).
    Used by the extract endpoint for pre-fill.
    """
    from apps.invoices.models import FileRef

    try:
        file_ref = FileRef.objects.get(pk=file_id)
    except FileRef.DoesNotExist:
        return {"error": "File not found"}

    try:
        from ai.pipelines.ocr_pipeline import run as run_ocr

        result = run_ocr(file_ref.path, process_all_pages=True)

        return {
            "success": result.success,
            "confidence": result.confidence,
            "extracted_fields": result.extracted_fields,
            "validation_errors": result.validation_errors,
            "flagged_manual": result.flagged_manual,
            "raw_text": result.raw_text,
            "pages_processed": result.pages_processed,
        }
    except Exception as e:
        logger.error(f"OCR standalone failed for {file_id}: {e}", exc_info=True)
        self.retry(exc=e)


@shared_task(bind=True, queue="anomaly", max_retries=1)
def run_anomaly_pipeline(self, expense_id: str):
    """
    Run anomaly detection on an expense.
    Updates anomaly_severity on the expense.
    """
    from apps.invoices.models import Expense

    try:
        expense = Expense.objects.select_related("vendor").get(pk=expense_id)
    except Expense.DoesNotExist:
        logger.error(f"Expense {expense_id} not found for anomaly check")
        return {"error": "Expense not found"}

    try:
        from ai.pipelines.anomaly_pipeline import run_anomaly_checks

        result = run_anomaly_checks(expense)

        # Save severity
        expense.anomaly_severity = result["severity"]
        # Merge flags into ocr_raw
        if expense.ocr_raw:
            expense.ocr_raw["anomaly_flags"] = result["flags"]
        else:
            expense.ocr_raw = {"anomaly_flags": result["flags"]}
        expense.save(update_fields=["anomaly_severity", "ocr_raw"])

        logger.info(
            f"Anomaly check for {expense_id}: severity={result['severity']}, "
            f"flags={len(result['flags'])}"
        )

        return result

    except Exception as e:
        logger.error(
            f"Anomaly pipeline failed for {expense_id}: {e}", exc_info=True
        )
        self.retry(exc=e)


@shared_task(bind=True, queue="analytics", max_retries=1)
def auto_generate_monthly_report(self):
    """
    Runs on 1st of each month (via Celery Beat).
    Generates the previous month's financial summary and emails it to configured recipients.
    """
    import datetime

    from django.utils import timezone

    today = timezone.now().date()
    # Previous month
    first_of_this_month = today.replace(day=1)
    last_month = first_of_this_month - datetime.timedelta(days=1)
    month_key = last_month.strftime("%Y-%m")

    logger.info(f"[auto_generate_monthly_report] Generating summary for {month_key}")

    try:
        # Check if enabled
        from apps.core.models import ReportEmailConfig
        config, _ = ReportEmailConfig.objects.get_or_create(
            key="monthly_report",
            defaults={"recipients": ["finance@company.in", "cfo@company.in"], "enabled": True},
        )
        if not config.enabled:
            logger.info("[auto_generate_monthly_report] Disabled — skipping")
            return {"skipped": True, "reason": "disabled"}

        recipients = config.recipients
        if not recipients:
            logger.warning("[auto_generate_monthly_report] No recipients configured")
            return {"skipped": True, "reason": "no_recipients"}

        # Generate the summary (force regenerate)
        from apps.invoices.analytics_views import _build_monthly_summary
        summary = _build_monthly_summary(month_key=month_key, regenerate=True, with_ai=True, actor=None)

        # Build email body
        month_display = last_month.strftime("%B %Y")
        total_spent = summary.get("totals", {}).get("total_paid", 0)
        pending = summary.get("totals", {}).get("total_pending", 0)
        ai_narrative = summary.get("ai_narrative", "")

        body = f"""FinanceAI — Monthly Financial Summary: {month_display}

Total Spend (Paid):  ₹{total_spent:,.0f}
Pending Approvals:   ₹{pending:,.0f}

{ai_narrative or "Summary generated successfully."}

---
This report was auto-generated by FinanceAI on {today.strftime('%d %B %Y')}.
Login at http://localhost:8000 to view the full report.
"""

        # Send emails
        from django.conf import settings
        from django.core.mail import send_mail

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@financeai.in")
        send_mail(
            subject=f"FinanceAI — Monthly Summary: {month_display}",
            message=body,
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=False,
        )

        logger.info(f"[auto_generate_monthly_report] Sent to {recipients} for {month_key}")
        return {"sent": True, "month_key": month_key, "recipients": recipients}

    except Exception as e:
        logger.error(f"[auto_generate_monthly_report] Failed: {e}", exc_info=True)
        self.retry(exc=e)
