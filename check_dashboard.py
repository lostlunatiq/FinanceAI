import asyncio

from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"JS Exception: {exc}"))

        print("Logging in...")
        await page.goto("http://localhost:8000/frontend/financeai_login/code.html")
        await page.fill("#login-username", "arjun.sharma")
        await page.fill("#login-password", "demo1234")
        await page.click("button:has-text('Sign In')")
        await page.wait_for_timeout(2000)

        print(f"Current URL: {page.url}")

        print("Checking Dashboard...")
        await page.wait_for_timeout(3000)

        if errors:
            print("ERRORS FOUND:")
            for e in errors:
                print(e)
        else:
            print("No console errors found on dashboard.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
