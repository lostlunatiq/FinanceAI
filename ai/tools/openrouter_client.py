"""
OpenRouter API client using the OpenAI-compatible SDK.
Supports vision models for invoice OCR and text models for anomaly analysis.
"""

import base64
import logging
import os
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


def get_client():
    """Get an OpenAI-compatible client pointed at OpenRouter."""
    from openai import OpenAI

    api_key = getattr(settings, "OPENROUTER_API_KEY", "") or os.environ.get(
        "OPENROUTER_API_KEY", ""
    )
    base_url = getattr(
        settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )

    if not api_key or api_key == "sk-or-placeholder":
        logger.warning("OpenRouter API key not configured — OCR will return mock data")
        return None

    return OpenAI(
        base_url=base_url,
        api_key=api_key,
        default_headers={
            "HTTP-Referer": getattr(
                settings, "OPENROUTER_SITE_URL", "https://3sc.financeai"
            ),
            "X-Title": getattr(settings, "OPENROUTER_APP_NAME", "FinanceAI"),
        },
    )


def call_vision_model(
    image_base64: str,
    media_type: str,
    prompt: str,
    model: Optional[str] = None,
    max_tokens: int = 4096,
) -> dict:
    """
    Send an image to a vision-capable model via OpenRouter.

    Returns:
        dict with 'content' (raw response text) and 'model' used
    """
    client = get_client()

    if client is None:
        return _mock_vision_response()

    if model is None:
        model = getattr(settings, "OPENROUTER_MODEL_OCR", None) \
             or getattr(settings, "OPENROUTER_MODEL_PRIMARY", "google/gemini-2.0-flash-001")

    # Models that support response_format json_object natively
    JSON_FORMAT_MODELS = {"gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"}
    use_json_format = any(m in model for m in JSON_FORMAT_MODELS)

    create_kwargs = dict(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_base64}"
                        },
                    },
                ],
            }
        ],
    )
    if use_json_format:
        create_kwargs["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(**create_kwargs)
        choices = response.choices if response and response.choices else []
        if not choices:
            logger.error("OpenRouter vision call returned no choices")
            raise ValueError("No choices in OpenRouter response")
        msg = choices[0].message
        content = (msg.content or "") if msg else ""
        return {
            "content": content,
            "model": getattr(response, "model", model),
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            },
        }

    except Exception as e:
        logger.error(f"OpenRouter vision call failed: {e}")
        raise


def call_text_model(
    prompt: str,
    system_prompt: str = "",
    model: Optional[str] = None,
    max_tokens: int = 2048,
) -> dict:
    """Send a text-only prompt to OpenRouter."""
    client = get_client()

    if client is None:
        return {"content": "{}", "model": "mock"}

    if model is None:
        model = getattr(settings, "OPENROUTER_MODEL_TEXT", None) \
             or getattr(settings, "OPENROUTER_MODEL_PRIMARY", "google/gemini-2.0-flash-001")

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
        )
        choices = response.choices if response and response.choices else []
        if not choices:
            raise ValueError("No choices in OpenRouter text response")
        content = (choices[0].message.content or "") if choices[0].message else ""
        return {
            "content": content,
            "model": getattr(response, "model", model),
        }
    except Exception as e:
        logger.error(f"OpenRouter text call failed: {e}")
        raise


def encode_image_to_base64(file_path: str) -> tuple[str, str]:
    """
    Read a file and return (base64_data, media_type).
    Supports JPEG, PNG, WebP, and PDF (first page).
    """
    ext = os.path.splitext(file_path)[1].lower()

    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    if ext == ".pdf":
        # For PDFs, try to convert first page to image
        try:
            from PIL import Image
            import io

            # Simple approach: read PDF as-is (many vision models support PDF directly)
            with open(file_path, "rb") as f:
                data = f.read()
            return base64.b64encode(data).decode("utf-8"), "application/pdf"
        except Exception:
            pass

    with open(file_path, "rb") as f:
        data = f.read()

    return base64.b64encode(data).decode("utf-8"), media_type


def _mock_vision_response() -> dict:
    """Return mock OCR data when API key is not configured."""
    import json

    mock_data = {
        "vendor_name": "Demo Vendor Pvt Ltd",
        "invoice_number": "INV-2026-DEMO-001",
        "invoice_date": "2026-04-15",
        "pre_gst_amount": 10000.00,
        "cgst": 900.00,
        "sgst": 900.00,
        "igst": 0.00,
        "total_amount": 11800.00,
        "gstin": "27AABCU9603R1ZM",
        "pan": "AABCU9603R",
        "line_items": [
            {
                "description": "Software Development Services",
                "qty": 1,
                "rate": 10000.00,
                "amount": 10000.00,
            }
        ],
        "bank_details": {
            "account_no": "XXXX1234",
            "ifsc": "SBIN0001234",
        },
        "confidence": {
            "vendor_name": 0.95,
            "invoice_number": 0.92,
            "invoice_date": 0.88,
            "amounts": 0.90,
            "gstin": 0.85,
        },
    }

    return {
        "content": json.dumps(mock_data),
        "model": "mock-model",
        "usage": {"prompt_tokens": 0, "completion_tokens": 0},
    }
