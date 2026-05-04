import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(name, url, token):
    print(f"Testing {name}...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{BASE_URL}{url}", headers=headers)
        if resp.status_code == 200:
            print(f"✅ {name} Success")
            return resp.json()
        else:
            print(f"❌ {name} Failed (Status: {resp.status_code})")
            print(resp.text)
            return None
    except Exception as e:
        print(f"❌ {name} Error: {str(e)}")
        return None

def main():
    # Login as CFO (assuming credentials from seed or default)
    print("Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": "cfo", 
        "password": "demo1234"
    })
    
    if login_resp.status_code != 200:
        # Try another common user from seed
        login_resp = requests.post(f"{BASE_URL}/auth/login/", json={
            "username": "admin",
            "password": "password123"
        })

    if login_resp.status_code != 200:
        print("Could not login. Ensure the server is running and seeded.")
        sys.exit(1)
        
    token = login_resp.json()["access"]
    print("Login Successful.")

    # Test all endpoints used in new reports
    test_endpoint("Spend Intelligence", "/invoices/analytics/spend-intelligence/", token)
    test_endpoint("Working Capital", "/invoices/analytics/working-capital/", token)
    test_endpoint("Department Variance", "/invoices/analytics/dept-variance/", token)
    test_endpoint("Budget Health", "/invoices/analytics/budget-health/", token)
    test_endpoint("Supplier Scorecard", "/invoices/analytics/supplier-scorecard/", token)
    test_endpoint("GST Reconciliation", "/invoices/analytics/gst-recon/", token)

if __name__ == "__main__":
    main()
