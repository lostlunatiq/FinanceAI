
import asyncio
import json
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"

ROLES = [
    ("vendor1", "demo1234", "Vendor"),
    ("employee1", "demo1234", "Employee"),
    ("l1_approver", "demo1234", "L1 Approver"),
    ("hod", "demo1234", "HOD"),
    ("fin_manager", "demo1234", "Finance Manager"),
    ("fin_admin", "demo1234", "Finance Admin"),
    ("cfo", "demo1234", "CFO"),
]

PAGES = [
    "/frontend/financeai_login/code.html",
    "/frontend/vendor_portal/code.html",
    "/frontend/accounts_payable_hub/code.html",
    "/frontend/cfo_command_center/code.html",
    "/frontend/audit_log/code.html",
    "/frontend/reports_hub/code.html",
    "/frontend/anomaly_detection/code.html",
    "/frontend/budget_management/code.html",
    "/frontend/cash_flow_forecast/code.html",
    "/frontend/user_management/code.html",
    "/frontend/expense_management/code.html",
    "/frontend/ap_match_fraud_control_1/code.html",
    "/frontend/ap_match_fraud_control_2/code.html",
    "/frontend/budgetary_guardrails/code.html",
    "/frontend/admin_vendor_management/code.html",
    "/",  # Tijori AI Main Shell
]

async def run_audit():
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for username, password, role in ROLES:
            print(f"--- Auditing Role: {role} ({username}) ---")
            context = await browser.new_context()
            page = await context.new_page()
            
            role_results = []
            
            # Helper to log errors
            def log_error(msg_type, text, url=None):
                role_results.append({
                    "type": msg_type,
                    "text": text,
                    "url": url or page.url
                })

            page.on("console", lambda msg: log_error("ConsoleError", msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: log_error("PageError", str(exc)))

            try:
                # 1. Login
                print(f"  Logging in...")
                await page.goto(f"{BASE_URL}/frontend/financeai_login/code.html")
                await page.fill("#login-email", username)
                await page.fill("#login-password", password)
                await page.click("#login-btn")
                await page.wait_for_timeout(3000)
                
                # Check for login errors
                error_div = await page.query_selector("#login-error")
                if error_div and await error_div.is_visible():
                    err = await error_div.inner_text()
                    log_error("LoginFailure", err)
                    print(f"  Login FAILED: {err}")
                    continue

                # 2. Visit Pages
                for path in PAGES:
                    print(f"  Visiting {path}...")
                    try:
                        response = await page.goto(f"{BASE_URL}{path}", timeout=10000)
                        await page.wait_for_timeout(2000)
                        
                        status = response.status if response else "No Response"
                        if status != 200:
                            log_error("HTTPStatus", f"Status {status}", path)
                        
                        # Check for UI level errors
                        content = await page.content()
                        if "An error occurred" in content:
                            log_error("UIError", "Found 'An error occurred' text", path)
                        if "Failed to fetch" in content:
                            log_error("UIError", "Found 'Failed to fetch' text", path)
                        if "404 Not Found" in content:
                            log_error("UIError", "Found '404 Not Found' text", path)
                            
                        # Check for empty state/broken components (heuristic)
                        # Look for common patterns of broken React/JS apps
                        if await page.query_selector("pre:has-text('Error')"):
                            log_error("UIError", "Stack trace or error pre-tag visible", path)
                            
                    except Exception as e:
                        log_error("NavigationException", str(e), path)

                # 3. Test Feature Specifics (Optional/Basic)
                # Check if specific buttons exist for role
                # ...
                
            except Exception as e:
                log_error("GlobalRoleException", str(e))
            finally:
                await context.close()
                results[role] = role_results

        await browser.close()
    
    with open("AUDIT_DATA.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(run_audit())
