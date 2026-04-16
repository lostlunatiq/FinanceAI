"""
Celery tasks for invoice processing.
Handles OCR extraction and anomaly detection as background jobs.
"""

import logging
from dataclasses import asdict
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

        result = run_ocr(expense.invoice_file.path)

        # Save OCR results to expense
        expense.ocr_raw = {
            "extracted_fields": result.extracted_fields,
            "raw_text": result.raw_text,
            "model_used": result.model_used,
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

        result = run_ocr(file_ref.path)

        return {
            "success": result.success,
            "confidence": result.confidence,
            "extracted_fields": result.extracted_fields,
            "validation_errors": result.validation_errors,
            "flagged_manual": result.flagged_manual,
            "raw_text": result.raw_text,
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
