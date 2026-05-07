import asyncio
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"

async def test_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type in ['error', 'warning'] else None)
        page.on("pageerror", lambda exc: errors.append(f"PageError: {str(exc)}"))

        # 1. Login on the NEW UI
        print("Loading new UI...")
        await page.goto(f"{BASE_URL}/")
        
        print("Logging in as CFO...")
        await page.fill("input[placeholder='Enter your username']", "cfo")
        await page.fill("input[placeholder='Enter your password']", "demo1234")
        await page.click("text=Sign In to Dashboard")
        
        try:
            await page.wait_for_selector("text=Intelligence Command", timeout=5000)
            print("Successfully logged in and loaded Command Center.")
        except Exception as e:
            print("Could not find Command Center:", e)
            print(await page.content())
            await browser.close()
            return
        
        print("\nNavigating to AI Intelligence...")
        try:
            await page.click("text=AI Intelligence", timeout=3000)
            await page.wait_for_timeout(2000)
            
            print("Checking Vendor Payment Optimisation section...")
            try:
                # Find the container for Vendor Payment Optimisation
                content = await page.locator("text=Vendor Payment Optimisation").locator("..").locator("..").inner_text()
                print("--- VENDOR PAYMENT OPTIMISATION SECTION ---")
                print(content)
                print("-----------------------------------------")
            except Exception as e:
                print("Could not find Vendor Payment Optimisation text:", e)
        except Exception as e:
            print("Could not navigate to AI Intelligence:", e)
            
        print("\nChecking all navigation links...")
        links = await page.locator("div#sidebar-container a").all()
        link_texts = []
        for link in links:
            try:
                text = await link.inner_text()
                href = await link.get_attribute("href")
                onclick = await link.get_attribute("onclick")
                link_texts.append((text.strip(), href, onclick))
            except:
                pass
                
        print("Found links:", [t[0] for t in link_texts])
        
        for text, href, onclick in link_texts:
            if not text: continue
            if text in ["Command Center", "AI Intelligence"]: continue
            
            print(f"Clicking '{text}'...")
            try:
                await page.click(f"div#sidebar-container a:has-text('{text}')", timeout=3000)
                await page.wait_for_timeout(1000)
                
                body_text = await page.inner_text("body")
                if "An error occurred" in body_text or "Failed to fetch" in body_text:
                    print(f"  ❌ Error visible on page '{text}'")
                elif "Not Found" in body_text or "404" in body_text:
                    print(f"  ❌ 404 Not Found on page '{text}'")
            except Exception as e:
                print(f"  ❌ Failed to click/load '{text}': {e}")
                
        print("\nConsole Errors Encountered:")
        for e in set(errors):
            print(e)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_ui())
