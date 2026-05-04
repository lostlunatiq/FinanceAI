import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("Navigating to login page...")
        await page.goto("http://localhost:8000/frontend/financeai_login/code.html")
        
        # Login
        print("Logging in...")
        await page.fill("input[type='text']", "admin")
        await page.fill("input[type='password']", "password123")
        await page.click("button:has-text('Sign In')")
        
        # Wait for navigation
        await page.wait_for_load_state("networkidle")
        
        print("Navigating to Reports Hub...")
        await page.goto("http://localhost:8000/frontend/reports_hub/code.html")
        await page.wait_for_load_state("networkidle")
        
        print("Page title:", await page.title())
        
        # Verify stats are populated (not —)
        budgets = await page.locator("#stat-budgets").text_content()
        print(f"Active Budgets Stat: {budgets.strip()}")
        
        # Wait a bit for JS to render cards
        await page.wait_for_timeout(2000)
        
        # Check if reports rendered
        cards = await page.locator(".report-card").count()
        print(f"Report cards rendered: {cards}")
        
        await page.screenshot(path="reports_hub_screenshot.png")
        print("Screenshot saved to reports_hub_screenshot.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
