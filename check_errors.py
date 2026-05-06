import asyncio

from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"JS Exception: {exc}"))

        print("Checking Login Page...")
        await page.goto("http://localhost:8000/frontend/financeai_login/code.html")
        await page.wait_for_timeout(1000)

        if errors:
            print("ERRORS FOUND:")
            for e in errors:
                print(e)
        else:
            print("No console errors found on login page.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
