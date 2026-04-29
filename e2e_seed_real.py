import requests
import os
import json
import time

BASE_URL = "http://localhost:8008/api/v1"
DEP_OPS = "b510518b-8771-4a85-a79b-1182105876f5"

def login(username, password):
    r = requests.post(f"{BASE_URL}/auth/login/", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"Login failed for {username}: {r.text}")
    return r.json().get("access")

fin_token = login("fin_admin", "demo1234")
headers = {"Authorization": f"Bearer {fin_token}"}

print("Creating Employees...")
emp_data = [
    {"username": "emp_sg", "email": "sg@demo.financeai.in", "password": "demo1234", "first_name": "Surya", "last_name": "Ghosh", "department": DEP_OPS, "employee_grade": 1},
    {"username": "emp_ranchi", "email": "ranchi@demo.financeai.in", "password": "demo1234", "first_name": "Ranchi", "last_name": "Ops", "department": DEP_OPS, "employee_grade": 1}
]
for d in emp_data:
    r = requests.post(f"{BASE_URL}/auth/register/", json=d, headers=headers)
    if r.status_code == 201:
        print(d["username"], "created")
    else:
        print(d["username"], "failed", r.status_code, r.text)

print("Creating Vendors...")
vendor_data = [
    {"name": "Bajaj Electronics", "gstin": "07AAAAA0000A1Z5", "pan": "AAAAA0000A", "email": "billing@bajaj.in", "vendor_type": "electronics", "create_portal_user": True, "portal_username": "vendor_bajaj", "portal_password": "demo1234"},
    {"name": "SML Security", "gstin": "07BBBBB0000B1Z5", "pan": "BBBBB0000B", "email": "billing@sml.in", "vendor_type": "security", "create_portal_user": True, "portal_username": "vendor_sml", "portal_password": "demo1234"}
]
for d in vendor_data:
    r = requests.post(f"{BASE_URL}/invoices/vendors/create/", json=d, headers=headers)
    print(d["portal_username"], r.status_code)
    if r.status_code == 201:
        vid = r.json().get("id")
        requests.post(f"{BASE_URL}/invoices/vendors/{vid}/activate/", json={"action": "activate"}, headers=headers)
        print("Activated", vid)

# Mapping files
user_files = {
    "vendor_bajaj": ["data/BAJAJ BILL.pdf", "data/0097457366,0087184314,India.PDF", "data/0097457438,0087184447,India.PDF"],
    "vendor_sml": ["data/SML Security Bill March-2026.pdf", "data/0097457440,0087184449,India.PDF", "data/Invoice.pdf"],
    "emp_sg": ["data/SG BILL.pdf", "data/560500198523.PDF"],
    "emp_ranchi": ["data/3 SC Ranchi Invoice 032026.pdf", "data/Packing list.pdf", "data/3_2Fhome_2Fexim_2FcheckListDocuments_2F0097457021_2C0087183931_2CIndia_2CPacking_20List_2026-02-06_07-38-51.PDF"]
}

def upload_and_submit(username, file_paths):
    token = login(username, "demo1234")
    if not token:
        print(f"Failed to login {username}")
        return
    user_headers = {"Authorization": f"Bearer {token}"}
    
    is_vendor = "vendor" in username

    for fpath in file_paths:
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
        
        def fmt_date(d):
            if not d: return None
            # If already YYYY-MM-DD
            if len(d) == 10 and d[4] == '-' and d[7] == '-': return d
            # Try DD/MM/YYYY or DD-MM-YYYY
            for sep in ['/', '-']:
                parts = d.split(sep)
                if len(parts) == 3:
                    if len(parts[2]) == 4: # DD/MM/YYYY
                        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    if len(parts[0]) == 4: # YYYY/MM/DD
                        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
            return None

        invoice_date = fmt_date(extr.get("invoice_date")) or "2026-04-10"

        submit_data = {
            "invoice_file": file_id,
            "invoice_number": extr.get("invoice_number") or f"INV-{int(time.time())}",
            "invoice_date": invoice_date,
            "total_amount": extr.get("total_amount") or 100.0,
            "cgst": extr.get("cgst") or 0.0,
            "sgst": extr.get("sgst") or 0.0,
            "igst": extr.get("igst") or 0.0,
            "business_purpose": extr.get("business_purpose") or f"Expense for {fpath.split('/')[-1]}"
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