# apps/invoices/tasks.py
from celery import shared_task


@shared_task(bind=True, max_retries=3)
def run_ocr_pipeline(self, expense_id: str):
    from apps.invoices.models import Expense
    from ai.agents.ocr_agent import run as ocr_run

    try:
        expense = Expense.objects.get(id=expense_id)
    except Expense.DoesNotExist:
        return

    if not expense.invoice_file:
        return

    path = expense.invoice_file.path
    filename = expense.invoice_file.original_filename.lower()
    media_type = "image/png" if filename.endswith(".png") else "image/jpeg"

    result = ocr_run(path, media_type)

    expense.ocr_raw = {
        "raw_text": result.raw_text,
        "extracted": result.extracted_fields,
        "c1": result.c1,
        "c2": result.c2,
        "c3": result.c3,
        "c_total": result.confidence,
        "validation_errors": result.validation_errors,
        "flagged_manual": result.flagged_manual,
    }
    expense.ocr_confidence = result.confidence

    if result.success:
        ef = result.extracted_fields
        if ef.get("pre_gst_amount"):
            expense.pre_gst_amount = ef["pre_gst_amount"]
        if ef.get("total_amount"):
            expense.total_amount = ef["total_amount"]
        if ef.get("cgst"):
            expense.cgst = ef["cgst"]
        if ef.get("sgst"):
            expense.sgst = ef["sgst"]
        if ef.get("igst"):
            expense.igst = ef["igst"]
        if ef.get("invoice_number") and not expense.invoice_number:
            expense.invoice_number = ef["invoice_number"]

    expense.save()
    run_anomaly_pipeline.delay(expense_id)


@shared_task
def run_anomaly_pipeline(expense_id: str):
    pass  # F-06
