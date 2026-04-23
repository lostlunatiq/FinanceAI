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
    Convert PDF pages to PNG images.
    Tries PyMuPDF first, falls back to pdf2image (poppler).
    Returns list of (image_bytes, media_type) tuples.
    """
    # ── Try PyMuPDF ──────────────────────────────────────────────────
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        images = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            mat = fitz.Matrix(2.78, 2.78)  # ~200 DPI
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img_bytes = pix.tobytes("png")
            images.append((img_bytes, "image/png"))
        doc.close()
        logger.info(f"PyMuPDF: converted {len(images)} PDF page(s)")
        return images
    except ImportError:
        logger.info("PyMuPDF not available, trying pdf2image (poppler)")
    except Exception as e:
        logger.warning(f"PyMuPDF failed: {e}, trying pdf2image")

    # ── Fallback: pdf2image (uses system poppler/pdftoppm) ────────────
    try:
        from pdf2image import convert_from_path
        from io import BytesIO

        pages = convert_from_path(file_path, dpi=200, fmt="png")
        images = []
        for page in pages:
            buf = BytesIO()
            page.save(buf, format="PNG")
            images.append((buf.getvalue(), "image/png"))
        logger.info(f"pdf2image: converted {len(images)} PDF page(s)")
        return images
    except Exception as e:
        logger.error(f"pdf2image also failed: {e}")
        return []


def run(file_path: str, media_type: str = "image/jpeg", process_all_pages: bool = True) -> OCRResult:
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
                images = images[:1]  # single-page mode if explicitly requested
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
            if not images:
                result.error = "PDF could not be converted to images. Ensure poppler-utils is installed."
            else:
                result.error = "OCR API calls failed for all pages."
            logger.error(result.error)
            result.success = False
            result.flagged_manual = True
            return result

        extracted, c1, c2 = best_result

        # Detect multiple invoices in one PDF
        if len(all_extracted) > 1:
            groups = _detect_multi_invoice(all_extracted)
            if len(groups) > 1:
                logger.info(f"Multi-invoice PDF detected: {len(groups)} invoices across {len(all_extracted)} pages")
                invoice_list = []
                for group in groups:
                    group_pages = [all_extracted[i] for i in group]
                    merged_inv = _merge_multipage(group_pages) if len(group_pages) > 1 else group_pages[0]
                    invoice_list.append(merged_inv)

                result.extracted_fields = {
                    "multi_invoice": True,
                    "invoice_count": len(invoice_list),
                    "invoices": invoice_list,
                }
                result.raw_text = " | ".join(e.get("raw_text", "") for e in all_extracted if e.get("raw_text"))
                result.c1 = c1
                result.c2 = c2
                result.c3 = 0.85
                result.confidence = round(0.4 * c1 + 0.4 * c2 + 0.2 * result.c3, 4)
                result.flagged_manual = False
                result.success = True
                result.validation_errors = []
                logger.info(f"OCR complete (multi-invoice): {len(invoice_list)} invoices, confidence={result.confidence:.2f}")
                return result

            result.extracted_fields = _merge_multipage(all_extracted)
        else:
            result.extracted_fields = extracted

        result.raw_text = " | ".join(e.get("raw_text", "") for e in all_extracted if e.get("raw_text"))
        result.c1 = c1
        result.c2 = c2
        result.c3 = 0.85
        result.confidence = round(0.4 * c1 + 0.4 * c2 + 0.2 * result.c3, 4)
        result.validation_errors = _validate_extracted(result.extracted_fields)

        # Try fallback model if confidence low
        ocr_review_threshold = getattr(settings, "OCR_CONFIDENCE_REVIEW", 0.50)
        if result.confidence < ocr_review_threshold and len(images) > 0:
            fallback_model = getattr(settings, "OPENROUTER_MODEL_FALLBACK", "anthropic/claude-haiku-4-5")
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
        logger.info(

            json.dumps(

                {

                    "model": result.model_used,

                    "pages": result.pages_processed,

                    "confidence": result.confidence,

                    "c1": result.c1,

                    "c2": result.c2,

                    "flagged": result.flagged_manual,

                    "errors": result.validation_errors,

                }

            )

        )

 
    except Exception as e:
        result.error = f"OCR pipeline error: {e}"
        logger.error(result.error, exc_info=True)

    return result


def _clean_json(content: str) -> str:
    """Strip markdown fences and repair truncated JSON from LLM responses."""
    content = content.strip()
    # Strip markdown fences
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    # Find JSON object boundaries
    start = content.find("{")
    if start < 0:
        return "{}"
    end = content.rfind("}") + 1
    if end > start:
        return content[start:end].strip()

    # Truncated JSON — attempt to close open braces/brackets/strings
    partial = content[start:]
    try:
        import json as _json
        _json.loads(partial)
        return partial
    except Exception:
        pass
    # Count open braces to auto-close
    depth = 0
    in_str = False
    esc = False
    for ch in partial:
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"' and not esc:
            in_str = not in_str
            continue
        if not in_str:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
    if in_str:
        partial += '"'  # close open string
    partial += "}" * max(depth, 0)
    return partial.strip()


def _detect_multi_invoice(all_extracted: list[dict]) -> list[list[int]]:
    """
    Detect if multiple separate invoices exist in a multi-page PDF.
    Returns list of page-index groups. E.g. [[0,1], [2]] = invoice1 on pages 0-1, invoice2 on page 2.
    Returns single group [[0,...,n-1]] if only one invoice detected.
    """
    if len(all_extracted) <= 1:
        return [list(range(len(all_extracted)))]

    invoice_numbers = [ext.get("invoice_number") for ext in all_extracted]
    non_null = [n for n in invoice_numbers if n]
    unique_numbers = set(non_null)

    # Single or no invoice number across all pages → one invoice
    if len(unique_numbers) <= 1:
        return [list(range(len(all_extracted)))]

    # Multiple distinct invoice numbers → split into groups
    groups = []
    current_group = [0]
    current_inv = invoice_numbers[0]

    for i in range(1, len(invoice_numbers)):
        inv = invoice_numbers[i]
        if inv and inv != current_inv:
            groups.append(current_group)
            current_group = [i]
            current_inv = inv
        else:
            current_group.append(i)
            if inv:
                current_inv = inv

    groups.append(current_group)
    return groups


def _merge_multipage(pages: list[dict]) -> dict:
    """
    Merge OCR results from multiple PDF pages.
    - line_items: accumulated from all pages
    - raw_text: concatenated from all pages
    - amounts (total, cgst, sgst, igst, pre_gst): last non-null page wins
      (grand total is usually on the last page)
    - all other fields: first non-null value wins (header info on page 1)
    """
    if not pages:
        return {}

    amount_fields = {"total_amount", "pre_gst_amount", "cgst", "sgst", "igst", "tds_amount"}

    merged = dict(pages[0])

    for page in pages[1:]:
        for key, value in page.items():
            if value is None:
                continue

            if key == "line_items" and isinstance(value, list) and value:
                merged_items = merged.get("line_items") or []
                merged["line_items"] = merged_items + value

            elif key == "raw_text":
                existing = merged.get("raw_text", "") or ""
                merged["raw_text"] = f"{existing}\n{value}".strip()

            elif key in amount_fields:
                # Always take the latest non-null amount (grand total on last page)
                merged[key] = value

            elif key == "confidence" and isinstance(value, dict):
                # Average confidence scores across pages
                existing_conf = merged.get("confidence") or {}
                merged["confidence"] = {
                    k: round((existing_conf.get(k, 0) + value.get(k, 0)) / 2, 4)
                    for k in set(existing_conf) | set(value)
                }

            else:
                # Header fields — first non-null wins
                if merged.get(key) is None:
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
