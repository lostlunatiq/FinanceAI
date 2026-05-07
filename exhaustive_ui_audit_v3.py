import asyncio
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"

async def test_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Set viewport to standard desktop
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE_ERROR: {str(exc)}"))

        # 1. Login on the NEW UI
        print("Loading Login Page...")
        await page.goto(f"{BASE_URL}/")
        
        print("Filling credentials for CFO...")
        # Use exact text content for inputs since placeholders are in custom TjInput
        await page.get_by_placeholder("Enter your username").fill("cfo")
        await page.get_by_placeholder("Enter your password").fill("demo1234")
        
        print("Clicking Sign In...")
        await page.click("text=Sign In to Dashboard")
        
        # Wait for either dashboard or a crash
        try:
            # Dashboard uses "Command Center" in nav or "Intelligence Command" in title
            await page.wait_for_selector("text=Command Center", timeout=10000)
            print("Successfully logged in.")
        except Exception as e:
            print("Login failed or dashboard didn't load in time.")
            await page.screenshot(path="login_failed.png")
            await browser.close()
            return

        # 2. Navigation Audit
        # Nav buttons are in <nav> and have specific icons/text
        nav_selectors = [
            "Command Center",
            "AI Copilot",
            "Accounts Payable",
            "Expense Management",
            "Budget Management",
            "Anomaly Detection",
            "Spend Intelligence",
            "Working Capital",
            "Vendor Risk",
            "Policy Compliance",
            "Dept Variance",
            "PO Matching",
            "Reports",
            "Identity & Access",
            "Audit Log"
        ]

        results = []
        for nav_text in nav_selectors:
            print(f"Testing Navigation: {nav_text}...")
            try:
                # Find the button in the sidebar nav
                btn = page.locator(f"nav button:has-text('{nav_text}')")
                if await btn.count() > 0:
                    await btn.click()
                    await page.wait_for_timeout(1500) # Give React time to render
                    
                    # Heuristic for page failure
                    body_content = await page.inner_text("body")
                    status = "OK"
                    if "An error occurred" in body_content or "Failed to fetch" in body_content:
                        status = "ERROR_VISIBLE"
                    elif "not found" in body_content.lower() or "404" in body_content:
                        status = "NOT_FOUND"
                    
                    # Specifically check Vendor Payment Optimisation on AI Hub (AI Copilot)
                    if nav_text == "AI Copilot":
                        opt_section = page.locator("text=Vendor Payment Optimisation")
                        if await opt_section.count() > 0:
                            section_text = await opt_section.locator("..").locator("..").inner_text()
                            if "No approved vendor bills" in section_text:
                                results.append({"page": "AI Hub", "feature": "Payment Optimisation", "status": "EMPTY_STATE"})
                            else:
                                results.append({"page": "AI Hub", "feature": "Payment Optimisation", "status": "DATA_VISIBLE"})
                        else:
                            results.append({"page": "AI Hub", "feature": "Payment Optimisation", "status": "MISSING"})

                    results.append({"page": nav_text, "status": status})
                else:
                    print(f"  ⚠️ Sidebar link '{nav_text}' not found for this role.")
            except Exception as e:
                print(f"  ❌ Error clicking '{nav_text}': {e}")
                results.append({"page": nav_text, "status": "CLICK_FAILED", "error": str(e)})

        print("\n--- AUDIT RESULTS ---")
        for res in results:
            print(res)
        print("--------------------")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_ui())
