"""
OCR Pipeline — Extracts structured invoice data from images/PDFs using
OpenRouter vision models (Gemini Flash primary, Claude Sonnet fallback).

PDF Support: Uses PyMuPDF (fitz) to render each PDF page to PNG at 200 DPI.
Multi-page: Processes all pages and merges extracted data.
"""

import json
import logging
import os
import io
import base64
from dataclasses import dataclass, field
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
6. If intra-state: CGST = SGST (each = GST/2), IGST = 0
7. If inter-state: CGST = SGST = 0, IGST = full GST
8. For each field, provide a confidence score 0.0–1.0
9. If a field is not found, set value to null and confidence to 0.0
10. Extract ALL line items

OUTPUT JSON SCHEMA (return ONLY valid JSON, no markdown):
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
  "bank_details": {"account_no": "string", "ifsc": "string"},
  "raw_text": "full extracted text",
  "confidence": {
    "vendor_name": 0.0-1.0,
    "invoice_number": 0.0-1.0,
    "invoice_date": 0.0-1.0,
    "amounts": 0.0-1.0,
    "gstin": 0.0-1.0,
    "overall": 0.0-1.0
  }
}"""


@dataclass
class OCRResult:
    success: bool = False
    raw_text: str = ""
    extracted_fields: dict = field(default_factory=dict)
    confidence: float = 0.0
    c1: float = 0.0
    c2: float = 0.0
    c3: float = 0.0
    validation_errors: list = field(default_factory=list)
    flagged_manual: bool = False
    model_used: str = ""
    error: str = ""
    pages_processed: int = 0


def pdf_to_images(file_path: str) -> list[tuple[bytes, str]]:
    """
    Convert PDF pages to PNG images using PyMuPDF.
    Returns list of (image_bytes, media_type) tuples.
    """
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        images = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render at 200 DPI (scale factor ~2.78 from 72 DPI base)
            mat = fitz.Matrix(2.78, 2.78)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img_bytes = pix.tobytes("png")
            images.append((img_bytes, "image/png"))
        doc.close()
        return images
    except ImportError:
        logger.warning("PyMuPDF not installed, falling back to raw PDF")
        with open(file_path, "rb") as f:
            return [(f.read(), "application/pdf")]
    except Exception as e:
        logger.error(f"PDF to image conversion failed: {e}")
        with open(file_path, "rb") as f:
            return [(f.read(), "application/pdf")]


def run(file_path: str, media_type: str = "image/jpeg", process_all_pages: bool = False) -> OCRResult:
    """
    Main OCR pipeline entry point.

    Args:
        file_path: Absolute path to the invoice image/PDF
        media_type: MIME type of the file
        process_all_pages: For PDFs, process all pages (default: first page only)

    Returns:
        OCRResult with extracted fields and confidence scores
    """
    from ai.tools.openrouter_client import call_vision_model

    result = OCRResult()

    full_path = file_path if os.path.isabs(file_path) else os.path.join(settings.MEDIA_ROOT, file_path)

    if not os.path.exists(full_path):
        result.error = f"File not found: {full_path}"
        logger.error(result.error)
        return result

    try:
        ext = os.path.splitext(full_path)[1].lower()

        if ext == ".pdf":
            images = pdf_to_images(full_path)
            if not process_all_pages:
                images = images[:1]
        else:
            media_type_map = {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".webp": "image/webp",
            }
            with open(full_path, "rb") as f:
                img_bytes = f.read()
            images = [(img_bytes, media_type_map.get(ext, "image/jpeg"))]

        result.pages_processed = len(images)

        # Process each page and merge results
        all_extracted = []
        best_confidence = 0.0
        best_result = None

        for page_num, (img_bytes, img_media_type) in enumerate(images):
            image_b64 = base64.b64encode(img_bytes).decode("utf-8")
            page_prompt = EXTRACTION_PROMPT
            if len(images) > 1:
                page_prompt += f"\n\nNote: This is page {page_num + 1} of {len(images)}."

            try:
                response = call_vision_model(
                    image_base64=image_b64,
                    media_type=img_media_type,
                    prompt=page_prompt,
                )
                result.model_used = response.get("model", "unknown")
                content = _clean_json(response.get("content", "{}"))
                extracted = json.loads(content)

                c1 = _calc_field_confidence(extracted)
                c2 = _calc_cross_validation(extracted)
                conf = round(0.4 * c1 + 0.4 * c2 + 0.2 * 0.85, 4)

                all_extracted.append(extracted)

                if conf > best_confidence:
                    best_confidence = conf
                    best_result = (extracted, c1, c2)

            except json.JSONDecodeError as e:
                logger.warning(f"Page {page_num + 1} JSON parse error: {e}")
            except Exception as e:
                logger.warning(f"Page {page_num + 1} OCR error: {e}")

        if best_result is None:
            result.error = "No pages extracted successfully"
            return result

        extracted, c1, c2 = best_result
        result.extracted_fields = _merge_multipage(all_extracted) if len(all_extracted) > 1 else extracted
        result.raw_text = " | ".join(e.get("raw_text", "") for e in all_extracted if e.get("raw_text"))
        result.c1 = c1
        result.c2 = c2
        result.c3 = 0.85
        result.confidence = round(0.4 * c1 + 0.4 * c2 + 0.2 * result.c3, 4)
        result.validation_errors = _validate_extracted(result.extracted_fields)

        # Try fallback model if confidence low
        ocr_review_threshold = getattr(settings, "OCR_CONFIDENCE_REVIEW", 0.50)
        if result.confidence < ocr_review_threshold and len(images) > 0:
            fallback_model = getattr(settings, "OPENROUTER_MODEL_FALLBACK", "anthropic/claude-sonnet-4")
            try:
                img_bytes, img_media_type = images[0]
                image_b64 = base64.b64encode(img_bytes).decode("utf-8")
                fb_response = call_vision_model(
                    image_base64=image_b64,
                    media_type=img_media_type,
                    prompt=EXTRACTION_PROMPT,
                    model=fallback_model,
                )
                fb_content = _clean_json(fb_response.get("content", "{}"))
                fb_extracted = json.loads(fb_content)
                fb_c1 = _calc_field_confidence(fb_extracted)
                fb_c2 = _calc_cross_validation(fb_extracted)
                fb_conf = round(0.4 * fb_c1 + 0.4 * fb_c2 + 0.2 * 0.85, 4)

                if fb_conf > result.confidence:
                    result.extracted_fields = fb_extracted
                    result.raw_text = fb_extracted.get("raw_text", result.raw_text)
                    result.c1 = fb_c1
                    result.c2 = fb_c2
                    result.confidence = fb_conf
                    result.model_used = fb_response.get("model", "fallback")
                    result.validation_errors = _validate_extracted(fb_extracted)
                    logger.info(f"OCR fallback improved confidence to {fb_conf}")
            except Exception as e:
                logger.warning(f"Fallback model failed: {e}")

        manual_threshold = getattr(settings, "OCR_CONFIDENCE_MANUAL", 0.30)
        result.flagged_manual = result.confidence < manual_threshold
        result.success = result.confidence >= manual_threshold

        logger.info(
            f"OCR complete: pages={result.pages_processed}, confidence={result.confidence:.2f}, "
            f"errors={len(result.validation_errors)}, manual={result.flagged_manual}"
        )

    except Exception as e:
        result.error = f"OCR pipeline error: {e}"
        logger.error(result.error, exc_info=True)

    return result


def _clean_json(content: str) -> str:
    """Strip markdown fences from JSON response."""
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    # Find JSON object boundaries
    start = content.find("{")
    end = content.rfind("}") + 1
    if start >= 0 and end > start:
        content = content[start:end]
    return content.strip()


def _merge_multipage(pages: list[dict]) -> dict:
    """Merge OCR results from multiple pages, prioritizing non-null values."""
    if not pages:
        return {}
    merged = dict(pages[0])
    for page in pages[1:]:
        for key, value in page.items():
            if key == "line_items" and isinstance(value, list) and value:
                merged_items = merged.get("line_items", []) or []
                merged["line_items"] = merged_items + value
            elif key == "raw_text":
                existing = merged.get("raw_text", "")
                merged["raw_text"] = f"{existing} {value}".strip() if existing else value
            elif value is not None and merged.get(key) is None:
                merged[key] = value
    return merged


def _calc_field_confidence(extracted: dict) -> float:
    required_fields = ["vendor_name", "invoice_number", "invoice_date", "total_amount"]
    optional_fields = ["pre_gst_amount", "cgst", "sgst", "igst", "gstin", "pan"]
    found_req = sum(1 for f in required_fields if extracted.get(f) is not None)
    found_opt = sum(1 for f in optional_fields if extracted.get(f) is not None)
    req_score = found_req / len(required_fields)
    opt_score = found_opt / len(optional_fields)
    model_conf = extracted.get("confidence", {})
    if isinstance(model_conf, dict) and model_conf.get("overall"):
        return round(0.4 * req_score + 0.2 * opt_score + 0.4 * float(model_conf["overall"]), 4)
    return round(0.7 * req_score + 0.3 * opt_score, 4)


def _calc_cross_validation(extracted: dict) -> float:
    score = 1.0
    pre_gst = _to_float(extracted.get("pre_gst_amount"))
    cgst = _to_float(extracted.get("cgst"))
    sgst = _to_float(extracted.get("sgst"))
    igst = _to_float(extracted.get("igst"))
    total = _to_float(extracted.get("total_amount"))

    if total and pre_gst and total > 0:
        calculated = pre_gst + cgst + sgst + igst
        if abs(calculated - total) / total > 0.02:
            score -= 0.3
    if cgst > 0 and sgst > 0 and igst > 0:
        score -= 0.2
    if cgst > 0 and sgst > 0 and abs(cgst - sgst) > 0.01:
        score -= 0.1
    gstin = extracted.get("gstin", "")
    if gstin and len(str(gstin)) != 15:
        score -= 0.1
    pan = extracted.get("pan", "")
    if pan and len(str(pan)) != 10:
        score -= 0.1
    return max(0.0, round(score, 4))


def _validate_extracted(extracted: dict) -> list:
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
    if total and pre_gst and total > 0:
        calculated = pre_gst + cgst + sgst + igst
        if abs(calculated - total) > total * 0.02:
            errors.append(f"Amount mismatch: {pre_gst}+taxes={calculated:.2f} vs total={total}")
    if cgst > 0 and sgst > 0 and igst > 0:
        errors.append("Both intra-state and inter-state GST detected")
    gstin = str(extracted.get("gstin", ""))
    if gstin and gstin != "None" and len(gstin) != 15:
        errors.append(f"Invalid GSTIN length: {len(gstin)} (expected 15)")
    return errors


def _to_float(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0
