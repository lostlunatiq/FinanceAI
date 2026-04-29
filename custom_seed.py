import requests
import os
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8008/api/v1"

def login(username, password):
    try:
        r = requests.post(f"{BASE_URL}/auth/login/", json={"username": username, "password": password})
        if r.status_code != 200:
            print(f"Login failed for {username}: {r.text}")
            return None
        return r.json().get("access")
    except Exception as e:
        print(f"Login error for {username}: {e}")
        return None

# Mapping files to new users
user_files = {
    "vendor_cloud": ["data/SG BILL.pdf", "data/BAJAJ BILL.pdf"],
    "vendor_it": ["data/SML Security Bill March-2026.pdf"],
    "emp_eng_new": ["data/Invoice.pdf"],
    "emp_ds_new": ["data/3 SC Ranchi Invoice 032026.pdf"]
}

def upload_and_submit(username, file_paths):
    token = login(username, "demo1234")
    if not token:
        print(f"Failed to login {username}")
        return
    user_headers = {"Authorization": f"Bearer {token}"}
    
    is_vendor = "vendor" in username

    for fpath in file_paths:
        if not os.path.exists(fpath):
            print(f"File not found: {fpath}")
            continue
            
        print(f"[{username}] Processing {fpath}...")
        with open(fpath, "rb") as f:
            ur = requests.post(f"{BASE_URL}/files/upload/", headers=user_headers, files={"file": (os.path.basename(fpath), f, "application/pdf")})
        
        if ur.status_code != 201:
            print("Upload failed", ur.text)
            continue
        file_id = ur.json()["id"]
        
        print(f"  Running OCR on {file_id}...")
        ocr_r = requests.post(f"{BASE_URL}/files/ocr/", json={"file_id": file_id}, headers=user_headers)
        if ocr_r.status_code != 200:
            print("OCR failed", ocr_r.text)
            continue
        
        extr = ocr_r.json().get("extracted_fields", {})
        
        def clean_date(d):
            if not d: return "2026-04-10"
            d = str(d).strip()
            # Try to parse various formats
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%b %d, %Y", "%d %b %Y"]:
                try:
                    return datetime.strptime(d, fmt).strftime("%Y-%m-%d")
                except:
                    continue
            return "2026-04-10"

        invoice_date = clean_date(extr.get("invoice_date"))

        submit_data = {
            "invoice_file": file_id,
            "invoice_number": extr.get("invoice_number") or f"INV-{int(time.time())}-{os.path.basename(fpath)[:5]}",
            "invoice_date": invoice_date,
            "total_amount": extr.get("total_amount") or 100.0,
            "cgst": extr.get("cgst") or 0.0,
            "sgst": extr.get("sgst") or 0.0,
            "igst": extr.get("igst") or 0.0,
            "business_purpose": extr.get("business_purpose") or f"Enterprise Expense: {os.path.basename(fpath)}"
        }
        
        if is_vendor:
            sr = requests.post(f"{BASE_URL}/invoices/vendor/bills/", json=submit_data, headers=user_headers)
        else:
            sr = requests.post(f"{BASE_URL}/invoices/submit/", json=submit_data, headers=user_headers)
        
        if sr.status_code == 201:
            print("  Successfully submitted", sr.json().get("ref_no", "Bill created"))
        else:
            print("  Submit failed", sr.text)

for u, paths in user_files.items():
    upload_and_submit(u, paths)
