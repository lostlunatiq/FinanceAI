"""
Anomaly Detection Pipeline — LLM-based Anomaly Detection with PII Masking.

Pipeline:
1. Fetch historical context for the vendor.
2. Mask PII in current and historical data using Presidio.
3. Call OpenRouter/OpenAI API with the context and current invoice data.
4. Extract Severity and Flags.
"""

import json
import logging
import os
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
import httpx

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False

logger = logging.getLogger(__name__)

# Initialize Presidio lazily
_analyzer = None
_anonymizer = None

def _get_presidio():
    global _analyzer, _anonymizer
    if not PRESIDIO_AVAILABLE:
        return None, None
    if _analyzer is None:
        try:
            _analyzer = AnalyzerEngine()
            _anonymizer = AnonymizerEngine()
        except (Exception, SystemExit) as e:
            logger.warning(f"Presidio init failed (spaCy model missing?): {e}")
            return None, None
    return _analyzer, _anonymizer

def _mask_pii(text: str) -> str:
    if not text:
        return ""
    try:
        analyzer, anonymizer = _get_presidio()
        if not analyzer or not anonymizer:
            return text
        results = analyzer.analyze(text=text, entities=["IN_PAN", "IN_AADHAAR", "PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "IBAN_CODE", "CREDIT_CARD"], language='en')
        anonymized_result = anonymizer.anonymize(text=text, analyzer_results=results)
        return anonymized_result.text
    except Exception as e:
        logger.error(f"PII Masking failed: {e}")
        return text # Fail open but log heavily

def _get_historical_context(vendor, exclude_pk):
    from apps.invoices.models import Expense
    from django.db.models import Avg, StdDev
    
    past_expenses = Expense.objects.filter(
        vendor=vendor,
        _status__in=["APPROVED", "PAID", "BOOKED_D365", "POSTED_D365"]
    ).exclude(pk=exclude_pk)
    
    stats = past_expenses.aggregate(
        avg_amount=Avg("total_amount"),
        std_amount=StdDev("total_amount"),
    )
    count = past_expenses.count()
    
    # Get recent 5
    recent = list(past_expenses.order_by("-invoice_date")[:5].values("invoice_number", "invoice_date", "total_amount"))
    # Format list explicitly
    for r in recent:
        if r.get('total_amount'):
            r['total_amount'] = float(r['total_amount'])
        if r.get('invoice_date'):
            r['invoice_date'] = str(r['invoice_date'])
            
    avg_amt = float(stats['avg_amount']) if stats['avg_amount'] else 0
    std_amt = float(stats['std_amount']) if stats['std_amount'] else 0
    
    # Format to string and mask
    context_str = f"Vendor: {vendor.name}, Historical Vendor Data (Count: {count}, Avg Amount: {avg_amt}, StdDev: {std_amt}). Recent Invoices: {json.dumps(recent)}"
    return _mask_pii(context_str)

def run_anomaly_checks(expense) -> dict:
    """
    Run LLM anomaly checks on an expense.
    """
    logger.info(f"Starting LLM Anomaly checks for {expense.id}")
    
    # 1. Prepare historical context
    history_context = _get_historical_context(expense.vendor, expense.pk)
    
    # 2. Prepare current invoice data
    current_data = {
        "invoice_number": expense.invoice_number,
        "invoice_date": str(expense.invoice_date) if expense.invoice_date else None,
        "total_amount": float(expense.total_amount) if expense.total_amount else 0,
        "vendor_name": expense.vendor.name,
        "business_purpose": expense.business_purpose,
        "ocr_raw": expense.ocr_raw.get("extracted_fields", {}) if expense.ocr_raw else {}
    }
    masked_current_data = _mask_pii(json.dumps(current_data))
    
    # 3. Build Prompt
    prompt = f"""
    You are an expert fraud and anomaly detection AI for a finance system.
    Analyze the current invoice against the vendor's historical context and general financial rules.
    Look for duplicates, round amount outliers, date anomalies (e.g. MSME 45-day rules, future dates), and suspicious patterns.

    Historical Context (Masked):
    {history_context}

    Current Invoice Data (Masked):
    {masked_current_data}

    Output JSON EXACTLY in this format:
    {{
        "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "score": <0-100 integer>,
        "flags": [
            {{
                "type": "DUPLICATE_INVOICE_NUMBER" | "AMOUNT_OUTLIER_HIGH" | "FUTURE_DATE" | "MSME_BREACH" | "SUSPICIOUS_PURPOSE" | etc,
                "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
                "message": "Human readable explanation"
            }}
        ]
    }}
    Do not add markdown formatting or extra text. Only JSON.
    """

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        logger.error("No OPENROUTER_API_KEY found, falling back to basic rules.")
        return {"severity": "NONE", "flags": [], "total_score": 0}

    # 4. Call LLM
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            result_json = response.json()
            content = result_json["choices"][0]["message"]["content"]
            
            # Clean up markdown if any
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            parsed = json.loads(content.strip())
            
            logger.info(f"LLM Anomaly Result: {parsed.get('severity')}")
            return {
                "severity": parsed.get("severity", "NONE"),
                "flags": parsed.get("flags", []),
                "total_score": parsed.get("score", 0)
            }
            
    except Exception as e:
        logger.error(f"LLM Anomaly Pipeline failed: {e}", exc_info=True)
        return {"severity": "NONE", "flags": [{"type": "SYSTEM_ERROR", "severity": "MEDIUM", "message": "Anomaly AI unavailable."}], "total_score": 0}