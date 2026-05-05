import requests
import json

BASE_URL = "http://localhost:8008/api/v1"

USERS = [
    ("arjun.sharma", "demo1234", "CFO"),
    ("priya.nair", "demo1234", "Finance Admin"),
    ("vikram.mehta", "demo1234", "Finance Manager"),
    ("divya.krishnan", "demo1234", "Engg HOD"),
    ("rohit.kapoor", "demo1234", "Ops HOD"),
    ("sunita.rao", "demo1234", "HR HOD"),
    ("anil.desai", "demo1234", "Mkt HOD"),
    ("neha.gupta", "demo1234", "Employee 1"),
    ("rahul.joshi", "demo1234", "Employee 2"),
    ("kavita.iyer", "demo1234", "Employee 3"),
    ("sanjay.reddy", "demo1234", "Employee 4"),
    ("vendor.infosys", "demo1234", "Vendor 1"),
    ("vendor.staples", "demo1234", "Vendor 2"),
]

ENDPOINTS = [
    ("Auth ME", "GET", "/auth/me/"),
    ("User List", "GET", "/auth/users/"),
    ("Vendor List", "GET", "/invoices/vendors/"),
    ("Finance Vendor Bills", "GET", "/invoices/finance/vendor-bills/"),
    ("Vendor Bills (Self)", "GET", "/invoices/vendor/bills/"),
    ("Budgets", "GET", "/invoices/budgets/"),
    ("Anomalies", "GET", "/invoices/finance/anomalies/"),
    ("Dashboard Stats", "GET", "/invoices/dashboard/stats/"),
    ("Analytics Command Center", "GET", "/invoices/analytics/command-center/"),
    ("Audit Logs", "GET", "/audit/"),
]

print("Starting RBAC Test...\n")

results = []

for username, password, role in USERS:
    # Login
    r = requests.post(f"{BASE_URL}/auth/login/", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"[{role}] LOGIN FAILED for {username}")
        continue
    token = r.json().get("access")
    
    print(f"\n--- Testing {role} ({username}) ---")
    headers = {"Authorization": f"Bearer {token}"}
    
    for ep_name, method, path in ENDPOINTS:
        url = f"{BASE_URL}{path}"
        if method == "GET":
            res = requests.get(url, headers=headers)
        elif method == "POST":
            res = requests.post(url, headers=headers, json={})
            
        print(f"{ep_name:<25}: {res.status_code}")
        
        # We can flag if someone who shouldn't have access gets a 200, 
        # or if an API crashes with 500
        if res.status_code >= 500:
            results.append((role, ep_name, "API Error 500", res.text))
        
        if role.startswith("Employee") and ep_name in ["Audit Logs", "Analytics Command Center", "Finance Vendor Bills"] and res.status_code == 200:
            results.append((role, ep_name, "Permission Leak", "Employee accessed restricted endpoint"))
            
        if role.startswith("Vendor") and ep_name in ["User List", "Budgets", "Audit Logs", "Finance Vendor Bills"] and res.status_code == 200:
            results.append((role, ep_name, "Permission Leak", "Vendor accessed internal endpoint"))

print("\n--- ISSUES FOUND ---")
for r in results:
    print(r)
