import requests
import os

BASE_URL = "http://localhost:8008/api/v1"

# Login to get token
r = requests.post(f"{BASE_URL}/auth/login/", json={"username": "neha.gupta", "password": "demo1234"})
token = r.json().get("access")
headers = {"Authorization": f"Bearer {token}"}

# Create a fake PDF (just text)
with open("fake.pdf", "w") as f:
    f.write("This is not a real PDF.")

# Test 1: Upload fake PDF
with open("fake.pdf", "rb") as f:
    ur = requests.post(f"{BASE_URL}/files/upload/", headers=headers, files={"file": ("fake.pdf", f, "application/pdf")})
    print(f"Fake PDF upload: Status {ur.status_code}, Response {ur.text}")

# Test 2: Invalid extension
with open("fake.pdf", "rb") as f:
    ur = requests.post(f"{BASE_URL}/files/upload/", headers=headers, files={"file": ("fake.txt", f, "text/plain")})
    print(f"Text file upload: Status {ur.status_code}, Response {ur.text}")

# Test 3: Large file (simulate by sending large payload or just check if size limit exists)
# The prompt says test large files. Let's create a 10MB dummy file.
with open("large.pdf", "wb") as f:
    f.write(b"0" * (10 * 1024 * 1024))
    
with open("large.pdf", "rb") as f:
    ur = requests.post(f"{BASE_URL}/files/upload/", headers=headers, files={"file": ("large.pdf", f, "application/pdf")})
    print(f"Large file upload (10MB): Status {ur.status_code}, Response {ur.text}")

os.remove("fake.pdf")
os.remove("large.pdf")
