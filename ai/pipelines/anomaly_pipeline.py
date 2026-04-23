"""
Anomaly Detection Pipeline — Hybrid rules + Isolation Forest ML.

Pipeline:
1. Rule-based checks (fast, deterministic)
2. Isolation Forest ML scoring (statistical outlier detection)
3. Combine scores → severity (NONE/LOW/MEDIUM/HIGH/CRITICAL)
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

from rich import json

logger = logging.getLogger(__name__)

# Signal weights for severity scoring
SIGNAL_WEIGHTS = {
    "DUPLICATE_INVOICE_NUMBER": 100,   # Auto-reject
    "BANK_ACCOUNT_CHANGED_RECENTLY": 60,
    "AMOUNT_OUTLIER_HIGH": 40,
    "ROUND_AMOUNT_FIRST_BILL": 30,
    "POSSIBLE_DUPLICATE": 70,
    "AMOUNT_UNUSUAL": 15,
    "AMOUNT_HIGH_VS_PROFILE": 20,
    "FUTURE_DATE": 35,
    "STALE_INVOICE": 20,
    "MSME_BREACH": 80,
    "MSME_WARNING": 30,
    "GST_MATH_MISMATCH": 20,
    "GST_TYPE_CONFLICT": 40,
    "OFF_HOURS_SUBMISSION": 15,
    "THRESHOLD_GAMING": 25,
    "ML_OUTLIER": 30,
}


def run_anomaly_checks(expense) -> dict:
    """
    Run all anomaly checks on an expense.

    Returns:
        dict with severity and flags list
    """
    flags = []

    # 1. Rule-based checks
    dup_flag = _check_duplicates(expense)
    if dup_flag:
        flags.append(dup_flag)

    outlier_flag = _check_amount_outlier(expense)
    if outlier_flag:
        flags.append(outlier_flag)

    date_flag = _check_date_anomalies(expense)
    if date_flag:
        flags.append(date_flag)

    gst_flag = _check_gst_math(expense)
    if gst_flag:
        flags.append(gst_flag)

    timing_flag = _check_timing_anomalies(expense)
    if timing_flag:
        flags.append(timing_flag)

    threshold_flag = _check_threshold_gaming(expense)
    if threshold_flag:
        flags.append(threshold_flag)

    # 2. ML Isolation Forest scoring
    ml_flag = _run_isolation_forest(expense)
    if ml_flag:
        flags.append(ml_flag)

    # 3. Calculate severity from weighted score
    total_score = sum(SIGNAL_WEIGHTS.get(f["type"], 10) for f in flags)

    if total_score >= 100:
        severity = "CRITICAL"
    elif total_score >= 50:
        severity = "HIGH"
    elif total_score >= 20:
        severity = "MEDIUM"
    elif total_score > 0:
        severity = "LOW"
    else:
        severity = "NONE"

    logger.info(
        json.dumps(
            {
                "severity": severity,
                "score": total_score,
                "flags": [f["type"] for f in flags],
            }
        )
    )
    return {"severity": severity, "flags": flags, "total_score": total_score}


def _check_duplicates(expense) -> dict | None:
    from apps.invoices.models import Expense

    # Hard duplicate: same vendor + invoice number
    similar = Expense.objects.filter(
        vendor=expense.vendor,
        invoice_number=expense.invoice_number,
    ).exclude(pk=expense.pk)

    if similar.exists() and expense.invoice_number:
        return {
            "type": "DUPLICATE_INVOICE_NUMBER",
            "severity": "CRITICAL",
            "message": f"Duplicate invoice number '{expense.invoice_number}' found for vendor '{expense.vendor.name}'",
            "similar_ids": [str(s.id) for s in similar[:5]],
        }

    # Fuzzy: same vendor + same amount + within 7 days
    if expense.total_amount and expense.invoice_date:
        fuzzy = Expense.objects.filter(
            vendor=expense.vendor,
            total_amount=expense.total_amount,
            invoice_date__range=(
                expense.invoice_date - timedelta(days=7),
                expense.invoice_date + timedelta(days=7),
            ),
        ).exclude(pk=expense.pk).exclude(_status__in=["REJECTED", "WITHDRAWN", "AUTO_REJECT"])

        if fuzzy.exists():
            return {
                "type": "POSSIBLE_DUPLICATE",
                "severity": "HIGH",
                "message": (
                    f"Possible duplicate: same vendor ({expense.vendor.name}), "
                    f"same amount (₹{expense.total_amount}), within 7-day window"
                ),
                "similar_ids": [str(s.id) for s in fuzzy[:5]],
            }

    return None


def _check_amount_outlier(expense) -> dict | None:
    from apps.invoices.models import Expense
    from django.db.models import Avg, StdDev

    if not expense.total_amount:
        return None

    stats = Expense.objects.filter(
        vendor=expense.vendor,
        _status__in=["APPROVED", "PAID", "BOOKED_D365", "POSTED_D365"],
    ).exclude(pk=expense.pk).aggregate(
        avg_amount=Avg("total_amount"),
        std_amount=StdDev("total_amount"),
    )

    avg = stats.get("avg_amount")
    std = stats.get("std_amount")

    if avg and std and float(std) > 0:
        z_score = abs(float(expense.total_amount) - float(avg)) / float(std)
        if z_score > 3.0:
            return {
                "type": "AMOUNT_OUTLIER_HIGH",
                "severity": "HIGH",
                "message": f"Amount ₹{expense.total_amount} is {z_score:.1f}σ above vendor avg ₹{avg:.0f}",
                "z_score": round(z_score, 2),
            }
        elif z_score > 2.0:
            return {
                "type": "AMOUNT_UNUSUAL",
                "severity": "MEDIUM",
                "message": f"Amount ₹{expense.total_amount} is {z_score:.1f}σ from vendor avg ₹{avg:.0f}",
                "z_score": round(z_score, 2),
            }

    if expense.vendor.avg_invoice_amount:
        vendor_avg = float(expense.vendor.avg_invoice_amount)
        if vendor_avg > 0:
            ratio = float(expense.total_amount) / vendor_avg
            if ratio > 3.0:
                from apps.invoices.models import Expense as ExpModel
                existing_count = ExpModel.objects.filter(vendor=expense.vendor).exclude(pk=expense.pk).count()
                if existing_count == 0:
                    return {
                        "type": "ROUND_AMOUNT_FIRST_BILL",
                        "severity": "MEDIUM",
                        "message": f"First bill from vendor at ₹{expense.total_amount} — {ratio:.1f}x typical amount",
                    }
                return {
                    "type": "AMOUNT_HIGH_VS_PROFILE",
                    "severity": "MEDIUM",
                    "message": f"Amount ₹{expense.total_amount} is {ratio:.1f}x vendor profile avg ₹{vendor_avg:.0f}",
                }

    return None


def _check_date_anomalies(expense) -> dict | None:
    if not expense.invoice_date:
        return None
    today = date.today()

    if expense.invoice_date > today:
        return {
            "type": "FUTURE_DATE",
            "severity": "HIGH",
            "message": f"Invoice date {expense.invoice_date} is in the future",
        }

    age_days = (today - expense.invoice_date).days

    if expense.vendor.msme_registered:
        if age_days > 45:
            return {
                "type": "MSME_BREACH",
                "severity": "CRITICAL",
                "message": f"MSME 45-day payment limit breached! Invoice is {age_days} days old",
            }
        elif age_days > 30:
            return {
                "type": "MSME_WARNING",
                "severity": "HIGH",
                "message": f"MSME payment deadline approaching: {45-age_days} days remaining",
            }

    if age_days > 90:
        return {
            "type": "STALE_INVOICE",
            "severity": "MEDIUM",
            "message": f"Invoice is {age_days} days old (submitted {expense.invoice_date})",
        }

    return None


def _check_gst_math(expense) -> dict | None:
    pre_gst = float(expense.pre_gst_amount or 0)
    cgst = float(expense.cgst or 0)
    sgst = float(expense.sgst or 0)
    igst = float(expense.igst or 0)
    total = float(expense.total_amount or 0)

    if total == 0 or pre_gst == 0:
        return None

    if (cgst > 0 or sgst > 0) and igst > 0:
        return {
            "type": "GST_TYPE_CONFLICT",
            "severity": "HIGH",
            "message": "Both intra-state (CGST+SGST) and inter-state (IGST) tax applied simultaneously",
        }

    calculated = pre_gst + cgst + sgst + igst
    if abs(calculated - total) > total * 0.02:
        return {
            "type": "GST_MATH_MISMATCH",
            "severity": "MEDIUM",
            "message": f"GST math error: components sum to ₹{calculated:.0f} but total is ₹{total:.0f}",
        }

    return None


def _check_timing_anomalies(expense) -> dict | None:
    """Check for submissions during off-hours (2 AM – 5 AM IST)."""
    if not expense.created_at:
        return None
    hour = expense.created_at.hour
    if 2 <= hour <= 5:
        return {
            "type": "OFF_HOURS_SUBMISSION",
            "severity": "LOW",
            "message": f"Bill submitted at {hour}:00 (off-hours: 2 AM–5 AM)",
        }
    return None


def _check_threshold_gaming(expense) -> dict | None:
    """Check if amount is just below approval threshold (₹50k, ₹1L, ₹5L)."""
    if not expense.total_amount:
        return None
    amount = float(expense.total_amount)
    thresholds = [50000, 100000, 500000, 1000000]
    for t in thresholds:
        if t * 0.95 <= amount < t:
            return {
                "type": "THRESHOLD_GAMING",
                "severity": "MEDIUM",
                "message": f"Amount ₹{amount:,.0f} is within 5% below approval threshold ₹{t:,.0f}",
            }
    return None


def _run_isolation_forest(expense) -> dict | None:
    """
    Run Isolation Forest on expense features.
    Returns anomaly flag if ML score indicates outlier.
    """
    try:
        import numpy as np
        from sklearn.ensemble import IsolationForest
        from apps.invoices.models import Expense
        from django.db.models import F

        # Get historical data for training
        hist = Expense.objects.filter(
            _status__in=["APPROVED", "PAID", "BOOKED_D365", "POSTED_D365"],
        ).exclude(pk=expense.pk).values(
            "total_amount", "invoice_date", "created_at", "pre_gst_amount"
        )[:500]

        if len(hist) < 10:
            return None

        features = []
        for h in hist:
            features.append(_extract_features(h))

        X_train = np.array(features)

        # Train Isolation Forest
        clf = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42,
            n_jobs=1,
        )
        clf.fit(X_train)

        # Score current expense
        current_features = np.array([_extract_features({
            "total_amount": expense.total_amount,
            "invoice_date": expense.invoice_date,
            "created_at": expense.created_at,
            "pre_gst_amount": expense.pre_gst_amount,
        })])

        score = clf.score_samples(current_features)[0]
        prediction = clf.predict(current_features)[0]

        if prediction == -1 and score < -0.3:
            return {
                "type": "ML_OUTLIER",
                "severity": "MEDIUM",
                "message": f"Isolation Forest flagged as statistical outlier (score: {score:.3f})",
                "ml_score": round(float(score), 4),
            }

    except Exception as e:
        logger.debug(f"Isolation Forest skipped: {e}")

    return None


def _extract_features(record: dict) -> list:
    """Extract numeric features for ML from an expense record."""
    from datetime import date as date_type
    amount = float(record.get("total_amount") or 0)
    inv_date = record.get("invoice_date")
    created_at = record.get("created_at")
    pre_gst = float(record.get("pre_gst_amount") or 0)

    day_of_month = inv_date.day if inv_date else 15
    day_of_week = inv_date.weekday() if inv_date else 2
    month = inv_date.month if inv_date else 6
    hour = created_at.hour if created_at else 12
    gst_ratio = (amount - pre_gst) / amount if amount > 0 and pre_gst > 0 else 0.18

    return [
        min(amount / 1000000, 100),   # Amount in lakhs (capped)
        day_of_month,
        day_of_week,
        month,
        hour,
        min(gst_ratio * 100, 50),    # GST % (capped)
    ]
