import asyncio
import json
import traceback
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROLES = [
    ("vendor.infosys", "demo1234", "Vendor"),
    ("neha.gupta", "demo1234", "Employee"),
    ("divya.krishnan", "demo1234", "HOD"),
    ("vikram.mehta", "demo1234", "Finance Manager"),
    ("priya.nair", "demo1234", "Finance Admin"),
    ("arjun.sharma", "demo1234", "CFO"),
]

BASE_URL = "http://localhost:8008"

async def explore_page(page, url, role, results):
    print(f"    Exploring {url}")
    try:
        response = await page.goto(url, timeout=10000)
        await page.wait_for_load_state("networkidle", timeout=5000)
    except Exception as e:
        results.append({
            "Role": role, "Page / Module": url, "Button / Feature": "Page Load",
            "Issue Type": "Navigation", "Severity": "High",
            "Steps to Reproduce": f"Navigate to {url}",
            "Expected Behavior": "Page loads successfully",
            "Actual Behavior": str(e)
        })
        return

    if response and response.status >= 400:
        results.append({
            "Role": role, "Page / Module": url, "Button / Feature": "Page Load",
            "Issue Type": "API", "Severity": "High",
            "Steps to Reproduce": f"Navigate to {url}",
            "Expected Behavior": "Status 200 OK",
            "Actual Behavior": f"Status {response.status}"
        })

    # Check for dead links
    dead_links = await page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a[href="#"], a[href=""]')).map(a => a.innerText.trim() || a.id || 'Unnamed Link');
    }""")
    for dl in dead_links:
        if dl:
            results.append({
                "Role": role, "Page / Module": url, "Button / Feature": f"Link: {dl}",
                "Issue Type": "UI", "Severity": "Medium",
                "Steps to Reproduce": f"Look at link '{dl}'",
                "Expected Behavior": "Valid href navigation",
                "Actual Behavior": "href is '#' or empty (Dead Link)"
            })

    # Find buttons
    buttons = await page.evaluate("""() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.innerText.trim() || b.id || 'Unnamed Button',
            disabled: b.disabled
        }));
    }""")
    
    # We won't click all buttons to avoid state corruption/navigation loops, 
    # but we log if there are errors visible on the page
    body_text = await page.content()
    if "An error occurred" in body_text or "Failed to fetch" in body_text or "undefined" in body_text.lower():
        results.append({
            "Role": role, "Page / Module": url, "Button / Feature": "Page Content",
            "Issue Type": "Data", "Severity": "High",
            "Steps to Reproduce": "View page content",
            "Expected Behavior": "Clean data rendered",
            "Actual Behavior": "Found 'Failed to fetch', 'An error occurred', or 'undefined' in DOM"
        })

    # Collect visible links to other modules
    links = await page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a[href^="/frontend/"]')).map(a => a.getAttribute('href'));
    }""")
    return list(set(links))

async def main():
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for username, password, role in ROLES:
            context = await browser.new_context()
            page = await context.new_page()
            
            # Setup error listeners
            page.on("console", lambda msg: results.append({
                "Role": role, "Page / Module": page.url, "Button / Feature": "Console",
                "Issue Type": "UI", "Severity": "Low",
                "Steps to Reproduce": "Load page", "Expected Behavior": "No console errors",
                "Actual Behavior": msg.text
            }) if msg.type == "error" else None)
            
            page.on("pageerror", lambda exc: results.append({
                "Role": role, "Page / Module": page.url, "Button / Feature": "JS Exception",
                "Issue Type": "UI", "Severity": "High",
                "Steps to Reproduce": "Load page", "Expected Behavior": "No JS errors",
                "Actual Behavior": str(exc)
            }))
            
            print(f"Testing Role: {role} ({username})")
            try:
                await page.goto(f"{BASE_URL}/frontend/financeai_login/code.html")
                await page.fill("input[type='text']", username)
                await page.fill("input[type='password']", password)
                await page.click("button:has-text('Sign In')")
                await page.wait_for_timeout(2000)
                
                # Check login success
                if "login" in page.url:
                    error_msg = await page.evaluate("() => { const el = document.getElementById('login-error'); return el ? el.innerText : null; }")
                    results.append({
                        "Role": role, "Page / Module": "Login", "Button / Feature": "Sign In",
                        "Issue Type": "Navigation", "Severity": "Critical",
                        "Steps to Reproduce": f"Login with {username}/{password}",
                        "Expected Behavior": "Redirect to dashboard",
                        "Actual Behavior": f"Stuck on login page. Error: {error_msg}"
                    })
                    await context.close()
                    continue
                
                # We start exploration from the redirected page (dashboard)
                visited = set()
                to_visit = [urlparse(page.url).path]
                
                # To prevent endless loop, limit to max 15 pages per role
                max_pages = 15
                while to_visit and len(visited) < max_pages:
                    current_path = to_visit.pop(0)
                    if current_path in visited:
                        continue
                    visited.add(current_path)
                    
                    new_links = await explore_page(page, f"{BASE_URL}{current_path}", role, results)
                    if new_links:
                        for link in new_links:
                            if link not in visited and link not in to_visit:
                                to_visit.append(link)
                
            except Exception as e:
                print(f"  Exception: {e}")
                results.append({
                    "Role": role, "Page / Module": "General", "Button / Feature": "Execution",
                    "Issue Type": "Exception", "Severity": "Critical",
                    "Steps to Reproduce": "Run script", "Expected Behavior": "No crash", "Actual Behavior": str(e)
                })
            finally:
                await context.close()
                
        await browser.close()
        
    with open("ui_test_report_data.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Done. Wrote results to ui_test_report_data.json")

if __name__ == "__main__":
    asyncio.run(main())