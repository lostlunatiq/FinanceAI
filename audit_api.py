
import requests
import json

BASE_URL = "http://localhost:8000"

ROLES = {
    "Vendor": ("vendor1", "demo1234"),
    "Employee": ("employee1", "demo1234"),
    "L1 Approver": ("l1_approver", "demo1234"),
    "Dept Head": ("hod", "demo1234"),
    "Finance Manager": ("fin_manager", "demo1234"),
    "Finance Admin": ("fin_admin", "demo1234"),
    "CFO": ("cfo", "demo1234"),
}

def login(username, password):
    url = f"{BASE_URL}/api/v1/auth/login/"
    try:
        response = requests.post(url, json={"username": username, "password": password}, timeout=5)
        if response.status_code == 200:
            return response.json().get("access")
        else:
            print(f"Login failed for {username}: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"Error logging in {username}: {e}")
        return None

def test_login_all():
    tokens = {}
    for role, (username, password) in ROLES.items():
        print(f"Attempting login for {role} ({username})...")
        token = login(username, password)
        if token:
            print(f"  SUCCESS")
            tokens[role] = token
        else:
            print(f"  FAILED")
    return tokens

if __name__ == "__main__":
    test_login_all()
