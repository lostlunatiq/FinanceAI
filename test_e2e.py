import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

from rest_framework.test import APIClient
from apps.invoices.models import Expense


USERS = {
    "Vendor": ("vendor1", "demo1234"),
    "Employee": ("employee1", "demo1234"),
    "AP Clerk": ("l1_approver", "demo1234"),
    "Department Head": ("hod", "demo1234"),
    "Finance Manager": ("fin_manager", "demo1234"),
    "Finance Admin": ("fin_admin", "demo1234"),
    "CFO": ("cfo", "demo1234"),
}


def authenticate(client, username, password):
    resp = client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")
    payload = resp.json() if hasattr(resp, "json") else {}
    token = payload.get("access")
    if token:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return resp.status_code, payload


def test_get(client, role, name, url, expected=(200, 403)):
    resp = client.get(url)
    ok = resp.status_code in expected
    status = "PASS" if ok else f"FAIL ({resp.status_code})"
    print(f"[{role}] GET  {name:<28} {status}")
    if not ok:
        print(f"    -> {getattr(resp, 'data', resp.content[:300])}")
    return ok


def test_post(client, role, name, url, payload, expected=(200, 201, 202, 400, 403)):
    resp = client.post(url, payload, format="json")
    ok = resp.status_code in expected
    status = "PASS" if ok else f"FAIL ({resp.status_code})"
    print(f"[{role}] POST {name:<28} {status}")
    if not ok:
        print(f"    -> {getattr(resp, 'data', resp.content[:300])}")
    return ok, resp


def run_tests():
    print("========================================")
    print("FinanceAI Role-wise API E2E")
    print("========================================")

    for role, (username, password) in USERS.items():
        print(f"\n--- {role} ({username}) ---")
        client = APIClient()
        status_code, payload = authenticate(client, username, password)
        if status_code != 200:
            print(f"[{role}] LOGIN                        FAIL ({status_code})")
            print(f"    -> {payload}")
            continue
        print(f"[{role}] LOGIN                        PASS")

        test_get(client, role, "Auth Me", "/api/v1/auth/me/")
        test_get(client, role, "Dashboard Stats", "/api/v1/invoices/dashboard/stats/")
        test_get(client, role, "Internal Expense Stats", "/api/v1/invoices/dashboard/stats/?type=internal")

        if role == "Vendor":
            test_get(client, role, "Vendor Bills", "/api/v1/invoices/vendor/bills/")
            test_get(client, role, "Vendor Profile", "/api/v1/invoices/vendor/profile/")
            test_post(
                client,
                role,
                "Vendor Bill Submit",
                "/api/v1/invoices/vendor/bills/",
                {
                    "invoice_number": "E2E-VENDOR-001",
                    "invoice_date": "2026-04-28",
                    "total_amount": 1250,
                    "pre_gst_amount": 1250,
                    "business_purpose": "E2E vendor bill",
                },
                expected=(201, 400, 403),
            )
            continue

        test_get(client, role, "Finance Queue", "/api/v1/invoices/finance/bills/queue/")
        test_get(client, role, "Internal Expenses", "/api/v1/invoices/finance/expenses/")
        test_get(client, role, "Budgets", "/api/v1/invoices/budgets/")
        test_get(client, role, "Anomalies", "/api/v1/invoices/finance/anomalies/")
        test_get(client, role, "Audit Log", "/api/v1/audit/")
        test_get(client, role, "Spend Intelligence", "/api/v1/invoices/analytics/spend-intelligence/")
        test_get(client, role, "Vendor Risk", "/api/v1/invoices/analytics/vendor-risk/")
        test_get(client, role, "Budget Health", "/api/v1/invoices/analytics/budget-health/")
        test_get(client, role, "Working Capital", "/api/v1/invoices/analytics/working-capital/")
        test_get(client, role, "Policy Compliance", "/api/v1/invoices/analytics/policy-compliance/")
        test_post(
            client,
            role,
            "NL Query",
            "/api/v1/nl-query/",
            {"question": "Show my top vendors by spend."},
            expected=(200, 403),
        )

        if role in {"Employee", "AP Clerk", "Department Head", "Finance Manager", "Finance Admin", "CFO"}:
            test_post(
                client,
                role,
                "Internal Expense Submit",
                "/api/v1/invoices/finance/expenses/",
                {
                    "expense_category": "Travel",
                    "description": f"E2E internal expense by {username}",
                    "amount": 4321.0,
                    "invoice_date": "2026-04-28",
                },
                expected=(201, 400, 403),
            )

        first_queue_item = client.get("/api/v1/invoices/finance/bills/queue/")
        queue_data = getattr(first_queue_item, "data", None)
        if isinstance(queue_data, list) and queue_data:
            first_id = queue_data[0].get("id")
            if first_id:
                test_get(client, role, "Finance Bill Detail", f"/api/v1/invoices/finance/bills/{first_id}/")

    print("\nTotal expenses now:", Expense.objects.count())


if __name__ == "__main__":
    run_tests()
