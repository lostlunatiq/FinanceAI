"""
Anomaly Detection Pipeline for expenses/invoices.
Checks for:
1. Duplicate invoices (fuzzy match on vendor + amount + date)
2. Amount outliers (z-score against vendor history)
3. Date anomalies (future dates, stale invoices)
4. GST math validation
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


def run_anomaly_checks(expense) -> dict:
    """
    Run all anomaly checks on an expense.

    Returns:
        dict with:
          - severity: NONE / LOW / MEDIUM / HIGH / CRITICAL
          - flags: list of anomaly flag dicts
    """
    flags = []

    # 1. Duplicate detection
    dup_flag = _check_duplicates(expense)
    if dup_flag:
        flags.append(dup_flag)

    # 2. Amount outlier
    outlier_flag = _check_amount_outlier(expense)
    if outlier_flag:
        flags.append(outlier_flag)

    # 3. Date anomalies
    date_flag = _check_date_anomalies(expense)
    if date_flag:
        flags.append(date_flag)

    # 4. GST validation
    gst_flag = _check_gst_math(expense)
    if gst_flag:
        flags.append(gst_flag)

    # Calculate overall severity
    severity = "NONE"
    if flags:
        severities = [f["severity"] for f in flags]
        if "CRITICAL" in severities:
            severity = "CRITICAL"
        elif "HIGH" in severities:
            severity = "HIGH"
        elif "MEDIUM" in severities:
            severity = "MEDIUM"
        else:
            severity = "LOW"

    return {
        "severity": severity,
        "flags": flags,
    }


def _check_duplicates(expense) -> dict | None:
    """Check for duplicate invoices from the same vendor."""
    from apps.invoices.models import Expense

    # Look for invoices from the same vendor with similar amounts
    similar = Expense.objects.filter(
        vendor=expense.vendor,
        invoice_number=expense.invoice_number,
    ).exclude(pk=expense.pk)

    if similar.exists():
        return {
            "type": "DUPLICATE_INVOICE_NUMBER",
            "severity": "CRITICAL",
            "message": f"Duplicate invoice number '{expense.invoice_number}' found for vendor '{expense.vendor.name}'",
            "similar_ids": [str(s.id) for s in similar[:5]],
        }

    # Fuzzy match: same vendor, same amount, within 7 days
    if expense.total_amount and expense.invoice_date:
        date_range_start = expense.invoice_date - timedelta(days=7)
        date_range_end = expense.invoice_date + timedelta(days=7)

        fuzzy_match = Expense.objects.filter(
            vendor=expense.vendor,
            total_amount=expense.total_amount,
            invoice_date__range=(date_range_start, date_range_end),
        ).exclude(pk=expense.pk)

        if fuzzy_match.exists():
            return {
                "type": "POSSIBLE_DUPLICATE",
                "severity": "HIGH",
                "message": (
                    f"Possible duplicate: same vendor ({expense.vendor.name}), "
                    f"same amount (₹{expense.total_amount}), within 7-day window"
                ),
                "similar_ids": [str(s.id) for s in fuzzy_match[:5]],
            }

    return None


def _check_amount_outlier(expense) -> dict | None:
    """Check if amount is an outlier compared to vendor history."""
    from apps.invoices.models import Expense
    from django.db.models import Avg, StdDev

    if not expense.total_amount:
        return None

    # Get vendor's historical stats
    stats = Expense.objects.filter(
        vendor=expense.vendor,
        _status__in=["APPROVED", "PAID", "BOOKED_D365", "POSTED_D365"],
    ).exclude(pk=expense.pk).aggregate(
        avg_amount=Avg("total_amount"),
        std_amount=StdDev("total_amount"),
    )

    avg = stats.get("avg_amount")
    std = stats.get("std_amount")

    if avg and std and std > 0:
        z_score = abs(float(expense.total_amount) - float(avg)) / float(std)

        if z_score > 3.0:
            return {
                "type": "AMOUNT_OUTLIER",
                "severity": "HIGH",
                "message": (
                    f"Amount ₹{expense.total_amount} is {z_score:.1f} standard deviations "
                    f"from vendor average ₹{avg:.2f}"
                ),
                "z_score": round(z_score, 2),
            }
        elif z_score > 2.0:
            return {
                "type": "AMOUNT_UNUSUAL",
                "severity": "MEDIUM",
                "message": (
                    f"Amount ₹{expense.total_amount} is {z_score:.1f}σ from vendor average ₹{avg:.2f}"
                ),
                "z_score": round(z_score, 2),
            }

    # Check against vendor's avg_invoice_amount if available
    if expense.vendor.avg_invoice_amount:
        vendor_avg = float(expense.vendor.avg_invoice_amount)
        if vendor_avg > 0:
            ratio = float(expense.total_amount) / vendor_avg
            if ratio > 3.0:
                return {
                    "type": "AMOUNT_HIGH_VS_PROFILE",
                    "severity": "MEDIUM",
                    "message": (
                        f"Amount ₹{expense.total_amount} is {ratio:.1f}x the vendor's "
                        f"average ₹{vendor_avg:.2f}"
                    ),
                }

    return None


def _check_date_anomalies(expense) -> dict | None:
    """Check for date-related anomalies."""
    if not expense.invoice_date:
        return None

    today = date.today()

    # Future date
    if expense.invoice_date > today:
        return {
            "type": "FUTURE_DATE",
            "severity": "HIGH",
            "message": f"Invoice date {expense.invoice_date} is in the future",
        }

    # Stale invoice (> 90 days old)
    age_days = (today - expense.invoice_date).days
    if age_days > 90:
        return {
            "type": "STALE_INVOICE",
            "severity": "MEDIUM",
            "message": f"Invoice is {age_days} days old (submitted {expense.invoice_date})",
        }

    # MSME compliance: 45-day payment deadline
    if expense.vendor.msme_registered and age_days > 30:
        days_remaining = 45 - age_days
        if days_remaining <= 0:
            return {
                "type": "MSME_BREACH",
                "severity": "CRITICAL",
                "message": (
                    f"MSME vendor payment deadline breached! "
                    f"Invoice is {age_days} days old (45-day statutory limit exceeded)"
                ),
            }
        elif days_remaining <= 15:
            return {
                "type": "MSME_WARNING",
                "severity": "HIGH",
                "message": (
                    f"MSME vendor payment deadline approaching: {days_remaining} days remaining"
                ),
            }

    return None


def _check_gst_math(expense) -> dict | None:
    """Validate GST calculations."""
    pre_gst = float(expense.pre_gst_amount or 0)
    cgst = float(expense.cgst or 0)
    sgst = float(expense.sgst or 0)
    igst = float(expense.igst or 0)
    total = float(expense.total_amount or 0)

    if total == 0 or pre_gst == 0:
        return None

    calculated_total = pre_gst + cgst + sgst + igst
    tolerance = total * 0.02  # 2% tolerance

    if abs(calculated_total - total) > tolerance:
        return {
            "type": "GST_MATH_MISMATCH",
            "severity": "MEDIUM",
            "message": (
                f"GST math error: {pre_gst} + {cgst} + {sgst} + {igst} = {calculated_total}, "
                f"but total is {total}"
            ),
        }

    # Both intra and inter-state GST
    if (cgst > 0 or sgst > 0) and igst > 0:
        return {
            "type": "GST_TYPE_CONFLICT",
            "severity": "HIGH",
            "message": "Both intra-state (CGST+SGST) and inter-state (IGST) tax applied",
        }

    return None
