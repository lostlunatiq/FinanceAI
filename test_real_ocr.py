
import os
import requests
import json
import time

BASE_URL = "http://localhost:8000"
DATA_DIR = "data"

# Test files from data folder
TEST_FILES = [
    "BAJAJ BILL.pdf",
    "SG BILL.pdf",
    "Invoice.pdf",
    "SML Security Bill March-2026.pdf"
]

def get_auth_token():
    url = f"{BASE_URL}/api/v1/auth/login/"
    resp = requests.post(url, json={"username": "fin_admin", "password": "demo1234"})
    if resp.status_code == 200:
        return resp.json()["access"]
    print(f"Login failed: {resp.text}")
    return None

def test_ocr(token, filename):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        return

    print(f"\n--- Testing OCR for: {filename} ---")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Upload File
    print("  Uploading file...")
    with open(file_path, "rb") as f:
        files = {"file": (filename, f, "application/pdf")}
        upload_resp = requests.post(f"{BASE_URL}/api/v1/files/upload/", headers=headers, files=files)
    
    if upload_resp.status_code != 201:
        print(f"  Upload FAILED: {upload_resp.status_code} {upload_resp.text}")
        return
    
    file_id = upload_resp.json()["id"]
    print(f"  Upload SUCCESS. File ID: {file_id}")

    # 2. Run OCR
    print("  Running synchronous OCR...")
    start_time = time.time()
    ocr_resp = requests.post(f"{BASE_URL}/api/v1/files/ocr/", headers=headers, json={"file_id": file_id})
    duration = time.time() - start_time
    
    if ocr_resp.status_code != 200:
        print(f"  OCR FAILED: {ocr_resp.status_code} {ocr_resp.text}")
        return
    
    data = ocr_resp.json()
    print(f"  OCR COMPLETE in {duration:.2f}s")
    print(f"  Status: {data.get('status')}")
    print(f"  Confidence: {data.get('confidence')}")
    print(f"  Extracted Fields: {json.dumps(data.get('extracted_fields'), indent=2)}")
    if data.get('error'):
        print(f"  Error: {data.get('error')}")

def run_all_tests():
    token = get_auth_token()
    if not token:
        return
    
    for filename in TEST_FILES:
        try:
            test_ocr(token, filename)
        except Exception as e:
            print(f"Exception testing {filename}: {e}")

if __name__ == "__main__":
    run_all_tests()
