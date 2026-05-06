import asyncio
import json

from playwright.async_api import async_playwright

ROLES = [
    ("vendor1", "demo1234", "Vendor"),
    ("employee1", "demo1234", "Employee"),
    ("hod", "demo1234", "HOD"),
    ("fin_manager", "demo1234", "Finance Manager"),
    ("fin_admin", "demo1234", "Finance Admin"),
    ("cfo", "demo1234", "CFO"),
]

PAGES = [
    "/frontend/vendor_portal/code.html",
    "/frontend/accounts_payable_hub/code.html",
    "/frontend/cfo_command_center/code.html",
    "/frontend/audit_log/code.html",
    "/frontend/reports_hub/code.html"
]

async def main():
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for username, password, role in ROLES:
            context = await browser.new_context()
            page = await context.new_page()

            # Catch console errors
            page.on("console", lambda msg: results.append({"role": role, "type": "Console", "text": msg.text}) if msg.type == "error" else None)

            # Catch page errors
            page.on("pageerror", lambda exc: results.append({"role": role, "type": "PageError", "text": str(exc)}))

            print(f"Testing Role: {role} ({username})")

            try:
                await page.goto("http://localhost:8008/frontend/financeai_login/code.html")
                await page.fill("input[type='text']", username)
                await page.fill("input[type='password']", password)
                await page.click("button:has-text('Sign In')")
                await page.wait_for_timeout(2000)

                # Check for login errors
                error_msg = await page.evaluate("() => { const el = document.getElementById('login-error'); return el ? el.innerText : null; }")
                if error_msg and "Invalid" in error_msg:
                    results.append({"role": role, "type": "Login", "text": error_msg})

                # Visit pages
                for url in PAGES:
                    print(f"  Visiting {url}...")
                    response = await page.goto(f"http://localhost:8008{url}")
                    if response and response.status >= 400:
                        results.append({"role": role, "type": "HTTP Error", "url": url, "text": f"Status {response.status}"})
                    await page.wait_for_timeout(2000)

                    # check for common dead links
                    dead_links = await page.evaluate("""() => {
                        return Array.from(document.querySelectorAll('a[href="#"]')).map(a => a.innerText.trim());
                    }""")
                    if dead_links:
                        results.append({"role": role, "type": "Dead Links", "url": url, "text": f"Found {len(dead_links)} dead links: {', '.join(dead_links[:3])}"})

                    # check if the page actually loaded data or showed errors
                    body_text = await page.content()
                    if "An error occurred" in body_text or "Failed to fetch" in body_text:
                        results.append({"role": role, "type": "Data Load Error", "url": url, "text": "UI shows error message"})

            except Exception as e:
                print(f"  Exception: {e}")
                results.append({"role": role, "type": "Exception", "text": str(e)})
            finally:
                await context.close()

        await browser.close()

    with open("ui_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
