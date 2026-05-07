import asyncio
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"

async def test_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE_ERROR: {str(exc)}"))

        # 1. Login
        print("Logging in as CFO...")
        await page.goto(f"{BASE_URL}/frontend/financeai_login/code.html")
        await page.fill("#login-email", "cfo")
        await page.fill("#login-password", "demo1234")
        await page.click("#login-btn")
        
        await page.wait_for_timeout(2000)
        
        print("Navigating to main app...")
        await page.goto(f"{BASE_URL}/")
        await page.wait_for_timeout(5000)
        
        content = await page.content()
        print("--- APP ROOT ---")
        print(await page.inner_html("#root"))
        print("----------------")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_ui())
