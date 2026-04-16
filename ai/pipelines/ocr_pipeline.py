"""
OCR Pipeline — Extracts structured invoice data from images/PDFs using
OpenRouter vision models (Gemini Flash primary, Claude Sonnet fallback).

Architecture:
1. Read image from FileRef path
2. Base64 encode
3. Send to OpenRouter API with structured extraction prompt
4. Parse JSON response
5. Calculate confidence scores (C1, C2, C3)
6. Return OCRResult dataclass
"""

import json
import logging
import os
from dataclasses import dataclass, field, asdict
from decimal import Decimal
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are an expert Indian invoice/bill OCR system. Extract ALL fields from this invoice image into the exact JSON schema below.

RULES:
1. Extract amounts as numbers without currency symbols (e.g., 10000.00 not ₹10,000.00)
2. Dates must be in YYYY-MM-DD format
3. GSTIN is exactly 15 characters (e.g., 27AABCU9603R1ZM)
4. PAN is exactly 10 characters (e.g., AABCU9603R)
5. Validate: pre_gst_amount + CGST + SGST + IGST ≈ total_amount
6. If intra-state supply: CGST = SGST (each = GST/2), IGST = 0
7. If inter-state supply: CGST = SGST = 0, IGST = full GST
8. For each field, provide a confidence score between 0.0 and 1.0
9. If a field is not found in the document, set its value to null and confidence to 0.0
10. Extract ALL line items with description, quantity, rate, and amount

OUTPUT JSON SCHEMA:
{
  "vendor_name": "string",
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "pre_gst_amount": number,
  "cgst": number,
  "sgst": number,
  "igst": number,
  "total_amount": number,
  "gstin": "string (15 chars)",
  "pan": "string (10 chars)",
  "line_items": [
    {"description": "string", "qty": number, "rate": number, "amount": number}
  ],
  "bank_details": {
    "account_no": "string",
    "ifsc": "string"
  },
  "raw_text": "full extracted text from the document",
  "confidence": {
    "vendor_name": 0.0-1.0,
    "invoice_number": 0.0-1.0,
    "invoice_date": 0.0-1.0,
    "amounts": 0.0-1.0,
    "gstin": 0.0-1.0,
    "overall": 0.0-1.0
  }
}

Return ONLY valid JSON. No markdown, no code fences, no extra text."""


@dataclass
class OCRResult:
    success: bool = False
    raw_text: str = ""
    extracted_fields: dict = field(default_factory=dict)
    confidence: float = 0.0
    c1: float = 0.0  # Field extraction confidence
    c2: float = 0.0  # Cross-validation confidence
    c3: float = 0.0  # Visual quality confidence
    validation_errors: list = field(default_factory=list)
    flagged_manual: bool = False
    model_used: str = ""
    error: str = ""


def run(file_path: str, media_type: str = "image/jpeg") -> OCRResult:
    """
    Main OCR pipeline entry point.

    Args:
        file_path: Absolute path to the invoice image/PDF
        media_type: MIME type of the file

    Returns:
        OCRResult with extracted fields and confidence scores
    """
    from ai.tools.openrouter_client import call_vision_model, encode_image_to_base64

    result = OCRResult()

    # 1. Validate file exists
    full_path = file_path
    if not os.path.isabs(file_path):
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)

    if not os.path.exists(full_path):
        result.error = f"File not found: {full_path}"
        logger.error(result.error)
        return result

    try:
        # 2. Encode image
        image_base64, detected_media_type = encode_image_to_base64(full_path)
        media_type = detected_media_type or media_type

        # 3. Call primary model (Gemini Flash — fast + cheap)
        logger.info(f"OCR: Sending to primary model for {file_path}")
        response = call_vision_model(
            image_base64=image_base64,
            media_type=media_type,
            prompt=EXTRACTION_PROMPT,
        )

        result.model_used = response.get("model", "unknown")

        # 4. Parse response
        content = response.get("content", "{}")
        # Clean up potential markdown fences
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        extracted = json.loads(content)
        result.extracted_fields = extracted
        result.raw_text = extracted.get("raw_text", "")

        # 5. Calculate confidence scores
        result.c1 = _calc_field_confidence(extracted)
        result.c2 = _calc_cross_validation(extracted)
        result.c3 = 0.85  # Default visual quality (no image analysis yet)

        # Weighted average
        result.confidence = round(0.4 * result.c1 + 0.4 * result.c2 + 0.2 * result.c3, 4)

        # 6. Validate extracted data
        result.validation_errors = _validate_extracted(extracted)

        # 7. Check if fallback needed
        ocr_review_threshold = getattr(settings, "OCR_CONFIDENCE_REVIEW", 0.50)
        if result.confidence < ocr_review_threshold:
            # Try fallback model
            logger.info(
                f"OCR: Low confidence ({result.confidence}), trying fallback model"
            )
            fallback_model = getattr(
                settings,
                "OPENROUTER_MODEL_FALLBACK",
                "anthropic/claude-sonnet-4",
            )
            try:
                fallback_response = call_vision_model(
                    image_base64=image_base64,
                    media_type=media_type,
                    prompt=EXTRACTION_PROMPT,
                    model=fallback_model,
                )
                fallback_content = fallback_response.get("content", "{}")
                fallback_content = fallback_content.strip()
                if fallback_content.startswith("```"):
                    fallback_content = fallback_content.split("\n", 1)[1]
                if fallback_content.endswith("```"):
                    fallback_content = fallback_content[:-3]

                fallback_extracted = json.loads(fallback_content.strip())
                fallback_c1 = _calc_field_confidence(fallback_extracted)
                fallback_c2 = _calc_cross_validation(fallback_extracted)
                fallback_conf = round(
                    0.4 * fallback_c1 + 0.4 * fallback_c2 + 0.2 * 0.85, 4
                )

                if fallback_conf > result.confidence:
                    result.extracted_fields = fallback_extracted
                    result.raw_text = fallback_extracted.get("raw_text", "")
                    result.c1 = fallback_c1
                    result.c2 = fallback_c2
                    result.confidence = fallback_conf
                    result.model_used = fallback_response.get("model", "fallback")
                    result.validation_errors = _validate_extracted(fallback_extracted)
                    logger.info(
                        f"OCR: Fallback model improved confidence to {fallback_conf}"
                    )
            except Exception as e:
                logger.warning(f"OCR: Fallback model failed: {e}")

        # 8. Determine if manual review needed
        manual_threshold = getattr(settings, "OCR_CONFIDENCE_MANUAL", 0.30)
        result.flagged_manual = result.confidence < manual_threshold
        result.success = result.confidence >= manual_threshold

        logger.info(
            f"OCR complete: confidence={result.confidence}, "
            f"errors={len(result.validation_errors)}, "
            f"manual={result.flagged_manual}"
        )

    except json.JSONDecodeError as e:
        result.error = f"Failed to parse OCR response as JSON: {e}"
        logger.error(result.error)
    except Exception as e:
        result.error = f"OCR pipeline error: {e}"
        logger.error(result.error, exc_info=True)

    return result


def _calc_field_confidence(extracted: dict) -> float:
    """
    C1: Field extraction confidence.
    How many required fields were successfully extracted?
    """
    required_fields = [
        "vendor_name",
        "invoice_number",
        "invoice_date",
        "total_amount",
    ]
    optional_fields = [
        "pre_gst_amount",
        "cgst",
        "sgst",
        "igst",
        "gstin",
        "pan",
    ]

    found_required = sum(
        1 for f in required_fields if extracted.get(f) is not None
    )
    found_optional = sum(
        1 for f in optional_fields if extracted.get(f) is not None
    )

    # Required fields weight 70%, optional 30%
    req_score = found_required / len(required_fields) if required_fields else 0
    opt_score = found_optional / len(optional_fields) if optional_fields else 0

    # Also factor in model's own confidence scores if available
    model_conf = extracted.get("confidence", {})
    if isinstance(model_conf, dict) and model_conf.get("overall"):
        return round(0.4 * req_score + 0.2 * opt_score + 0.4 * model_conf["overall"], 4)

    return round(0.7 * req_score + 0.3 * opt_score, 4)


def _calc_cross_validation(extracted: dict) -> float:
    """
    C2: Cross-validation confidence.
    Do the extracted amounts make mathematical sense?
    """
    score = 1.0
    errors = 0

    pre_gst = _to_float(extracted.get("pre_gst_amount"))
    cgst = _to_float(extracted.get("cgst"))
    sgst = _to_float(extracted.get("sgst"))
    igst = _to_float(extracted.get("igst"))
    total = _to_float(extracted.get("total_amount"))

    if total and pre_gst:
        # Check: pre_gst + taxes ≈ total (within 2% tolerance)
        calculated_total = pre_gst + cgst + sgst + igst
        if calculated_total > 0:
            diff_pct = abs(calculated_total - total) / total
            if diff_pct > 0.02:
                score -= 0.3
                errors += 1

    # Check GST logic
    if cgst > 0 and sgst > 0 and igst > 0:
        # Can't have both intra-state and inter-state GST
        score -= 0.2
        errors += 1

    if cgst > 0 and sgst > 0:
        # CGST should equal SGST
        if cgst > 0 and sgst > 0 and abs(cgst - sgst) > 0.01:
            score -= 0.1
            errors += 1

    # Validate GSTIN format
    gstin = extracted.get("gstin", "")
    if gstin and len(str(gstin)) != 15:
        score -= 0.1

    # Validate PAN format
    pan = extracted.get("pan", "")
    if pan and len(str(pan)) != 10:
        score -= 0.1

    return max(0.0, round(score, 4))


def _validate_extracted(extracted: dict) -> list:
    """Return a list of human-readable validation errors."""
    errors = []

    if not extracted.get("vendor_name"):
        errors.append("Vendor name not extracted")
    if not extracted.get("invoice_number"):
        errors.append("Invoice number not extracted")
    if not extracted.get("invoice_date"):
        errors.append("Invoice date not extracted")
    if not extracted.get("total_amount"):
        errors.append("Total amount not extracted")

    pre_gst = _to_float(extracted.get("pre_gst_amount"))
    cgst = _to_float(extracted.get("cgst"))
    sgst = _to_float(extracted.get("sgst"))
    igst = _to_float(extracted.get("igst"))
    total = _to_float(extracted.get("total_amount"))

    if total and pre_gst:
        calculated = pre_gst + cgst + sgst + igst
        if abs(calculated - total) > total * 0.02:
            errors.append(
                f"Amount mismatch: {pre_gst} + taxes ({cgst}+{sgst}+{igst}) = {calculated}, "
                f"but total is {total}"
            )

    if cgst > 0 and sgst > 0 and igst > 0:
        errors.append("Both intra-state (CGST+SGST) and inter-state (IGST) GST detected")

    gstin = str(extracted.get("gstin", ""))
    if gstin and len(gstin) != 15:
        errors.append(f"Invalid GSTIN length: {len(gstin)} (expected 15)")

    return errors


def _to_float(value) -> float:
    """Safely convert to float."""
    if value is None:
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0
