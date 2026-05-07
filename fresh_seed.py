#!/usr/bin/env python
"""
Fresh seed: wipe all data, create full org structure, vendors, invoices with varied statuses.
Run inside Docker: cd /app && python fresh_seed.py
"""
import django, os, uuid, random
from datetime import datetime, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile

User = get_user_model()  # apps.core.models.User

# ─── WIPE ────────────────────────────────────────────────────────────────────
print("=== WIPING ALL DATA ===")

from apps.invoices.models import Expense, ExpenseApprovalStep, ExpenseQuery, Vendor, Budget, MonthlyFinancialSummary, AIFeedback
from apps.core.models import Department, AuditLog, FileRef

try:
    AIFeedback.objects.all().delete()
except Exception: pass
try:
    ExpenseQuery.objects.all().delete()
except Exception: pass
try:
    ExpenseApprovalStep.objects.all().delete()
except Exception: pass
try:
    Expense.objects.all().delete()
    print("  Expenses cleared")
except Exception as e:
    print(f"  Expense error: {e}")

try:
    MonthlyFinancialSummary.objects.all().delete()
except Exception: pass
try:
    AuditLog.objects.all().delete()
    print("  AuditLogs cleared")
except Exception: pass

try:
    FileRef.objects.all().delete()
except Exception: pass

Vendor.objects.all().delete()
print("  Vendors cleared")
Budget.objects.all().delete()
print("  Budgets cleared")

# Clear media
media_dir = '/app/media/invoices'
if os.path.exists(media_dir):
    for f in os.listdir(media_dir):
        try: os.remove(os.path.join(media_dir, f))
        except: pass

User.objects.all().delete()
print("  Users cleared")

Department.objects.all().delete()
print("  Departments cleared")

print("  All data wiped.\n")

# ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
print("=== CREATING DEPARTMENTS ===")
dept_names = ['Engineering', 'Finance', 'HR', 'Sales', 'Operations', 'Marketing']
depts = {}
for name in dept_names:
    d = Department.objects.create(name=name)
    depts[name] = d
    print(f"  Dept: {name}")

# ─── USERS ───────────────────────────────────────────────────────────────────
print("\n=== CREATING USERS ===")

def make_user(username, email, password, first_name, last_name, grade, dept=None, is_superuser=False, is_staff=False):
    u = User.objects.create_user(
        username=username, email=email, password=password,
        first_name=first_name, last_name=last_name,
        is_superuser=is_superuser, is_staff=is_staff,
        employee_grade=grade,
    )
    if dept:
        u.department = dept
        u.save()
    return u

# CFO (superuser, no dept)
cfo = make_user('cfo_admin', 'cfo@financeai.com', 'Admin@123', 'Ramesh', 'Iyer',
                grade=5, is_superuser=True, is_staff=True)
print(f"  CFO: {cfo.username} / Admin@123")

# Finance Admin (grade 4)
fadmin = make_user('fin_admin', 'fin.admin@financeai.com', 'Admin@123', 'Priya', 'Sharma',
                   grade=4, dept=depts['Finance'])
print(f"  FinAdmin: {fadmin.username} / Admin@123")

# Finance Manager (grade 3)
fmgr = make_user('fin_mgr', 'fin.mgr@financeai.com', 'Admin@123', 'Vikram', 'Nair',
                  grade=3, dept=depts['Finance'])
print(f"  FinMgr: {fmgr.username} / Admin@123")

# HOD + 2 employees per dept
hods = {}
employees = {}

dept_user_data = {
    'Engineering': {
        'hod': ('hod_eng', 'hod.eng@financeai.com', 'Arjun', 'Mehta'),
        'emps': [('emp_eng1', 'emp.eng1@financeai.com', 'Neha', 'Gupta'),
                 ('emp_eng2', 'emp.eng2@financeai.com', 'Sanjay', 'Reddy')],
    },
    'Finance': {
        'hod': ('hod_fin', 'hod.fin@financeai.com', 'Kavya', 'Pillai'),
        'emps': [('emp_fin1', 'emp.fin1@financeai.com', 'Rahul', 'Joshi'),
                 ('emp_fin2', 'emp.fin2@financeai.com', 'Sneha', 'Patel')],
    },
    'HR': {
        'hod': ('hod_hr', 'hod.hr@financeai.com', 'Divya', 'Krishnan'),
        'emps': [('emp_hr1', 'emp.hr1@financeai.com', 'Amit', 'Singh'),
                 ('emp_hr2', 'emp.hr2@financeai.com', 'Pooja', 'Verma')],
    },
    'Sales': {
        'hod': ('hod_sales', 'hod.sales@financeai.com', 'Rohan', 'Kapoor'),
        'emps': [('emp_sales1', 'emp.sales1@financeai.com', 'Meena', 'Rao'),
                 ('emp_sales2', 'emp.sales2@financeai.com', 'Kiran', 'Das')],
    },
    'Operations': {
        'hod': ('hod_ops', 'hod.ops@financeai.com', 'Suresh', 'Kumar'),
        'emps': [('emp_ops1', 'emp.ops1@financeai.com', 'Anita', 'Mishra'),
                 ('emp_ops2', 'emp.ops2@financeai.com', 'Deepak', 'Tiwari')],
    },
    'Marketing': {
        'hod': ('hod_mkt', 'hod.mkt@financeai.com', 'Nidhi', 'Bose'),
        'emps': [('emp_mkt1', 'emp.mkt1@financeai.com', 'Arun', 'Ghosh'),
                 ('emp_mkt2', 'emp.mkt2@financeai.com', 'Sunita', 'Yadav')],
    },
}

for dept_name, info in dept_user_data.items():
    dept = depts[dept_name]
    h = make_user(info['hod'][0], info['hod'][1], 'Admin@123', info['hod'][2], info['hod'][3], grade=2, dept=dept)
    emp_list = []
    for eu in info['emps']:
        e = make_user(eu[0], eu[1], 'Admin@123', eu[2], eu[3], grade=1, dept=dept)
        emp_list.append(e)
    hods[dept_name] = h
    employees[dept_name] = emp_list
    print(f"  {dept_name}: HOD={h.username}, Emps={emp_list[0].username},{emp_list[1].username}")

print(f"\n  Total users: {User.objects.count()}")

# ─── BUDGETS ─────────────────────────────────────────────────────────────────
print("\n=== CREATING BUDGETS ===")
for dept_name, dept in depts.items():
    Budget.objects.create(
        name=f'{dept_name} Annual Budget 2026',
        department=dept,
        fiscal_year=2026,
        period='annual',
        start_date=datetime(2026, 1, 1).date(),
        end_date=datetime(2026, 12, 31).date(),
        total_amount=Decimal(str(random.randint(500000, 2000000))),
        status='ACTIVE',
        created_by=fadmin,
    )
print(f"  Budgets: {Budget.objects.count()}")

# ─── VENDORS ─────────────────────────────────────────────────────────────────
print("\n=== CREATING VENDORS ===")

vendor1 = Vendor.objects.create(
    name='Bajaj Electricals Ltd',
    email='accounts@bajajelectricals.com',
    phone='9876543210',
    gstin='27AAACB2894G1ZH',
    pan='AAACB2894G',
    bank_account_name='Bajaj Electricals Ltd',
    bank_account_number='012345678901',
    bank_ifsc='HDFC0001234',
    is_approved=True,
    status='ACTIVE',
)
print(f"  Vendor 1: {vendor1.name}")

vendor2 = Vendor.objects.create(
    name='SML Security Services Pvt Ltd',
    email='billing@smlsecurity.com',
    phone='9123456780',
    gstin='06AADCS1234M1ZX',
    pan='AADCS1234M',
    bank_account_name='SML Security Services',
    bank_account_number='987654321012',
    bank_ifsc='ICIC0005678',
    is_approved=True,
    status='ACTIVE',
)
print(f"  Vendor 2: {vendor2.name}")

# ─── HELPER: create PDF bytes ────────────────────────────────────────────────
def make_pdf_bytes(title, amount, vendor_name, invoice_no, dept_name):
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Helvetica', 'B', 16)
        pdf.cell(0, 10, 'TAX INVOICE', ln=True, align='C')
        pdf.ln(3)
        pdf.set_font('Helvetica', '', 11)
        pdf.cell(0, 8, f'Invoice No: {invoice_no}', ln=True)
        pdf.cell(0, 8, f'Date: {datetime.now().strftime("%d-%m-%Y")}', ln=True)
        pdf.cell(0, 8, f'Vendor: {vendor_name}', ln=True)
        pdf.cell(0, 8, f'Department: {dept_name}', ln=True)
        pdf.cell(0, 8, f'Description: {title}', ln=True)
        pdf.ln(5)
        cgst = round(amount * 0.09, 2)
        sgst = round(amount * 0.09, 2)
        total = amount + cgst + sgst
        pdf.cell(0, 8, f'Pre-GST Amount: Rs. {amount:,.2f}', ln=True)
        pdf.cell(0, 8, f'CGST (9%): Rs. {cgst:,.2f}', ln=True)
        pdf.cell(0, 8, f'SGST (9%): Rs. {sgst:,.2f}', ln=True)
        pdf.set_font('Helvetica', 'B', 11)
        pdf.cell(0, 8, f'Total Amount: Rs. {total:,.2f}', ln=True)
        return bytes(pdf.output())
    except Exception as ex:
        print(f"    PDF gen warning: {ex}")
        return f"%PDF-1.4\n% {invoice_no}\n% {vendor_name} - {title} - Rs.{amount}\n".encode()

def load_data_pdf(filename):
    path = f'/app/data/{filename}'
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return f.read()
    return None

# ─── HELPER: create FileRef for a PDF ────────────────────────────────────────
def save_file_ref(pdf_bytes, filename, uploader):
    os.makedirs('/app/media/invoices', exist_ok=True)
    # Save file to media
    ext = filename.rsplit('.', 1)[-1]
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = f'/app/media/invoices/{stored_name}'
    with open(full_path, 'wb') as f:
        f.write(pdf_bytes)
    ref = FileRef.objects.create(
        path=f'invoices/{stored_name}',
        original_filename=filename,
        uploaded_by=uploader,
    )
    return ref

# ─── HELPER: create Expense with approval steps ──────────────────────────────
def make_expense(submitted_by, vendor, category, description, amount_pre_gst,
                 cgst_rate=9, sgst_rate=9, igst_rate=0,
                 pdf_bytes=None, pdf_name=None,
                 invoice_number=None, invoice_date=None,
                 scenario='pending'):
    """
    scenario options:
      pending            - just submitted, L1 not yet approved
      hod_pending        - L1 approved, waiting for HOD
      approved_with_query - fully approved, HOD raised a query during flow
      rejected           - HOD rejected
      fin_pending        - L1+HOD approved, waiting Finance
      approved           - fully approved all steps
    """
    from apps.invoices.models import GRADE_FOR_STEP, STEP_TO_STATUS

    cgst = round(amount_pre_gst * cgst_rate / 100, 2)
    sgst = round(amount_pre_gst * sgst_rate / 100, 2)
    igst = round(amount_pre_gst * igst_rate / 100, 2)
    total = amount_pre_gst + cgst + sgst + igst

    ref_no = f"EXP-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    if not invoice_number:
        invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
    if not invoice_date:
        invoice_date = (datetime.now() - timedelta(days=random.randint(1, 30))).date()

    # Determine initial status
    if scenario == 'pending':
        status = 'PENDING_L1'
        step_num = 1
    elif scenario == 'hod_pending':
        status = 'PENDING_HOD'
        step_num = 3
    elif scenario in ('approved', 'approved_with_query'):
        status = 'APPROVED'
        step_num = None
    elif scenario == 'rejected':
        status = 'REJECTED'
        step_num = None
    elif scenario == 'fin_pending':
        status = 'PENDING_FIN_L1'
        step_num = 4
    else:
        status = 'PENDING_L1'
        step_num = 1

    file_ref = None
    if pdf_bytes and pdf_name:
        file_ref = save_file_ref(pdf_bytes, pdf_name, submitted_by)

    exp = Expense.objects.create(
        ref_no=ref_no,
        vendor=vendor,
        submitted_by=submitted_by,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        pre_gst_amount=Decimal(str(amount_pre_gst)),
        cgst=Decimal(str(cgst)),
        sgst=Decimal(str(sgst)),
        igst=Decimal(str(igst)),
        total_amount=Decimal(str(total)),
        business_purpose=description,
        _status=status,
        current_step=step_num,
        invoice_file=file_ref,
        submitted_at=timezone.now() - timedelta(days=random.randint(2, 15)),
    )

    dept = submitted_by.department
    hod_user = User.objects.filter(employee_grade=2, department=dept).first()
    fmgr_user = fmgr
    fadmin_user = fadmin

    now = timezone.now()

    if scenario == 'pending':
        # Just created, awaiting L1
        ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='PENDING',
        )
        return exp

    if scenario == 'hod_pending':
        ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='APPROVED',
            decided_at=now - timedelta(days=3),
            decision_reason='Confirmed',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=3, grade_required=2,
            assigned_to=hod_user,
            status='PENDING',
        )
        return exp

    if scenario == 'fin_pending':
        ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='APPROVED',
            decided_at=now - timedelta(days=5),
            decision_reason='Self-certified',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=3, grade_required=2,
            assigned_to=hod_user,
            status='APPROVED',
            decided_at=now - timedelta(days=3),
            decision_reason='Approved by HOD',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=4, grade_required=3,
            assigned_to=fmgr_user,
            status='PENDING',
        )
        return exp

    if scenario == 'rejected':
        ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='APPROVED',
            decided_at=now - timedelta(days=6),
            decision_reason='Self-certified',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=3, grade_required=2,
            assigned_to=hod_user,
            status='REJECTED',
            decided_at=now - timedelta(days=4),
            decision_reason='Amount exceeds policy limit / missing documentation',
        )
        return exp

    if scenario == 'approved_with_query':
        l1 = ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='APPROVED',
            decided_at=now - timedelta(days=7),
            decision_reason='Self-certified',
        )
        hod_step = ExpenseApprovalStep.objects.create(
            expense=exp, level=3, grade_required=2,
            assigned_to=hod_user,
            status='APPROVED',
            decided_at=now - timedelta(days=3),
            decision_reason='Approved after clarification',
        )
        # Add a query from HOD
        ExpenseQuery.objects.create(
            expense=exp,
            raised_by=hod_user,
            raised_at_step=3,
            question='Please attach supporting documentation and policy compliance form.',
            response='Attached all required documents. Compliance form signed.',
            responded_by=submitted_by,
            raised_at=now - timedelta(days=5),
            responded_at=now - timedelta(days=4),
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=4, grade_required=3,
            assigned_to=fmgr_user,
            status='APPROVED',
            decided_at=now - timedelta(days=2),
            decision_reason='Verified against budget',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=5, grade_required=4,
            assigned_to=fadmin_user,
            status='APPROVED',
            decided_at=now - timedelta(days=1),
            decision_reason='Payment processed',
        )
        exp.approved_at = now - timedelta(days=1)
        exp.save()
        return exp

    if scenario == 'approved':
        ExpenseApprovalStep.objects.create(
            expense=exp, level=1, grade_required=1,
            assigned_to=submitted_by,
            status='APPROVED',
            decided_at=now - timedelta(days=8),
            decision_reason='Self-certified',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=3, grade_required=2,
            assigned_to=hod_user,
            status='APPROVED',
            decided_at=now - timedelta(days=5),
            decision_reason='Verified and approved',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=4, grade_required=3,
            assigned_to=fmgr_user,
            status='APPROVED',
            decided_at=now - timedelta(days=3),
            decision_reason='Budget verified',
        )
        ExpenseApprovalStep.objects.create(
            expense=exp, level=5, grade_required=4,
            assigned_to=fadmin_user,
            status='APPROVED',
            decided_at=now - timedelta(days=1),
            decision_reason='Payment scheduled',
        )
        exp.approved_at = now - timedelta(days=1)
        exp.save()
        return exp

    return exp

# ─── Load real PDFs ───────────────────────────────────────────────────────────
bajaj_pdf  = load_data_pdf('BAJAJ BILL.pdf')
sml_pdf    = load_data_pdf('SML Security Bill March-2026.pdf')
sg_pdf     = load_data_pdf('SG BILL.pdf')
inv_pdf    = load_data_pdf('Invoice.pdf')
ranchi_pdf = load_data_pdf('3 SC Ranchi Invoice 032026.pdf')

print(f"\n  Real PDFs: bajaj={bool(bajaj_pdf)}, sml={bool(sml_pdf)}, sg={bool(sg_pdf)}, inv={bool(inv_pdf)}, ranchi={bool(ranchi_pdf)}")

# ─── INVOICES PER DEPARTMENT ─────────────────────────────────────────────────
print("\n=== CREATING EXPENSES/INVOICES ===")

# ── Engineering ───────────────────────────────────────────────────────────────
print("\n  Engineering:")
e = employees['Engineering']

pdf = bajaj_pdf or make_pdf_bytes('Electrical Equipment', 45000, 'Bajaj Electricals', 'BAJAJ-ENG-001', 'Engineering')
x = make_expense(e[0], vendor1, 'Infrastructure', 'Electrical equipment - server room upgrade',
                 45000, pdf_bytes=pdf, pdf_name='bajaj_eng_equip.pdf', invoice_number='BAJAJ-ENG-001',
                 scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount} | {e[0].get_full_name()}")

pdf = sml_pdf or make_pdf_bytes('Security Services', 28000, 'SML Security', 'SML-ENG-001', 'Engineering')
x = make_expense(e[1], vendor2, 'Professional Services', 'Security patrol services Q1 2026',
                 28000, pdf_bytes=pdf, pdf_name='sml_eng_security.pdf', invoice_number='SML-ENG-001',
                 scenario='rejected')
print(f"    {x.ref_no} | REJECTED | ₹{x.total_amount} | {e[1].get_full_name()}")

pdf = make_pdf_bytes('Software License', 15000, 'Bajaj Electricals', 'ENG-SW-001', 'Engineering')
x = make_expense(e[0], vendor1, 'Software & Subscriptions', 'Annual software license renewal',
                 15000, pdf_bytes=pdf, pdf_name='eng_software.pdf', scenario='pending')
print(f"    {x.ref_no} | PENDING | ₹{x.total_amount}")

pdf = make_pdf_bytes('Cloud Services', 62000, 'SML Security', 'ENG-CLOUD-001', 'Engineering')
x = make_expense(e[1], vendor2, 'Infrastructure', 'AWS cloud infrastructure Q1 2026',
                 62000, pdf_bytes=pdf, pdf_name='eng_cloud.pdf', scenario='fin_pending')
print(f"    {x.ref_no} | HOD Approved→Finance Pending | ₹{x.total_amount}")

# ── Finance ───────────────────────────────────────────────────────────────────
print("\n  Finance:")
e = employees['Finance']

pdf = inv_pdf or make_pdf_bytes('Accounting Software', 35000, 'SML Security', 'FIN-ACC-001', 'Finance')
x = make_expense(e[0], vendor2, 'Software & Subscriptions', 'Tally ERP annual subscription',
                 35000, pdf_bytes=pdf, pdf_name='fin_tally.pdf', invoice_number='FIN-ACC-001',
                 scenario='approved')
print(f"    {x.ref_no} | APPROVED | ₹{x.total_amount}")

pdf = make_pdf_bytes('Audit Services', 85000, 'Bajaj Electricals', 'FIN-AUD-001', 'Finance')
x = make_expense(e[1], vendor1, 'Professional Services', 'Statutory audit fees Q1 2026',
                 85000, pdf_bytes=pdf, pdf_name='fin_audit.pdf', scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount}")

pdf = make_pdf_bytes('GST Training', 22000, 'SML Security', 'FIN-TRN-001', 'Finance')
x = make_expense(e[0], vendor2, 'Training & Development', 'GST filing training program',
                 22000, pdf_bytes=pdf, pdf_name='fin_training.pdf', scenario='pending')
print(f"    {x.ref_no} | PENDING | ₹{x.total_amount}")

pdf = make_pdf_bytes('Office Supplies', 8500, 'Bajaj Electricals', 'FIN-SUP-001', 'Finance')
x = make_expense(e[1], vendor1, 'Office Supplies', 'Stationery and printing supplies',
                 8500, pdf_bytes=pdf, pdf_name='fin_supplies.pdf', scenario='rejected')
print(f"    {x.ref_no} | REJECTED | ₹{x.total_amount}")

# ── HR ────────────────────────────────────────────────────────────────────────
print("\n  HR:")
e = employees['HR']

pdf = ranchi_pdf or make_pdf_bytes('Recruitment Ads', 45000, 'Bajaj Electricals', 'HR-REC-001', 'HR')
x = make_expense(e[0], vendor1, 'HR & Recruitment', 'Job portal listing - March 2026',
                 45000, pdf_bytes=pdf, pdf_name='hr_recruitment.pdf', invoice_number='HR-REC-001',
                 scenario='approved')
print(f"    {x.ref_no} | APPROVED | ₹{x.total_amount}")

pdf = make_pdf_bytes('Wellness Program', 18000, 'SML Security', 'HR-WEL-001', 'HR')
x = make_expense(e[1], vendor2, 'Medical / Wellness', 'Employee wellness yoga sessions',
                 18000, pdf_bytes=pdf, pdf_name='hr_wellness.pdf', scenario='fin_pending')
print(f"    {x.ref_no} | HOD Approved→Finance | ₹{x.total_amount}")

pdf = make_pdf_bytes('Onboarding Materials', 12000, 'Bajaj Electricals', 'HR-ONB-001', 'HR')
x = make_expense(e[0], vendor1, 'Training & Development', 'New hire onboarding training materials',
                 12000, pdf_bytes=pdf, pdf_name='hr_onboarding.pdf', scenario='pending')
print(f"    {x.ref_no} | PENDING | ₹{x.total_amount}")

pdf = make_pdf_bytes('Background Verification', 32000, 'SML Security', 'HR-BGV-001', 'HR')
x = make_expense(e[1], vendor2, 'Professional Services', 'Background verification Q1 batch',
                 32000, pdf_bytes=pdf, pdf_name='hr_bgv.pdf', scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount}")

# ── Sales ─────────────────────────────────────────────────────────────────────
print("\n  Sales:")
e = employees['Sales']

pdf = make_pdf_bytes('Client Entertainment', 25000, 'Bajaj Electricals', 'SALES-ENT-001', 'Sales')
x = make_expense(e[0], vendor1, 'Meals & Entertainment', 'Client dinner - Tata Motors deal closure',
                 25000, cgst_rate=2.5, sgst_rate=2.5,
                 pdf_bytes=pdf, pdf_name='sales_entertainment.pdf', scenario='approved')
print(f"    {x.ref_no} | APPROVED | ₹{x.total_amount}")

pdf = sg_pdf or make_pdf_bytes('Trade Show', 95000, 'SML Security', 'SALES-TS-001', 'Sales')
x = make_expense(e[1], vendor2, 'Marketing & Events', 'Industry trade show booth rental',
                 95000, pdf_bytes=pdf, pdf_name='sales_tradeshow.pdf', invoice_number='SALES-TS-001',
                 scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount}")

pdf = make_pdf_bytes('Travel - Mumbai to Delhi', 42000, 'Bajaj Electricals', 'SALES-TRV-001', 'Sales')
x = make_expense(e[0], vendor1, 'Travel', 'Client visit travel expenses - Mumbai to Delhi',
                 42000, cgst_rate=5, sgst_rate=5,
                 pdf_bytes=pdf, pdf_name='sales_travel.pdf', scenario='pending')
print(f"    {x.ref_no} | PENDING | ₹{x.total_amount}")

pdf = make_pdf_bytes('Salesforce CRM', 55000, 'SML Security', 'SALES-CRM-001', 'Sales')
x = make_expense(e[1], vendor2, 'Software & Subscriptions', 'Salesforce CRM annual license',
                 55000, pdf_bytes=pdf, pdf_name='sales_crm.pdf', scenario='rejected')
print(f"    {x.ref_no} | REJECTED | ₹{x.total_amount}")

# ── Operations ────────────────────────────────────────────────────────────────
print("\n  Operations:")
e = employees['Operations']

pdf = make_pdf_bytes('HVAC Maintenance', 38000, 'Bajaj Electricals', 'OPS-HVAC-001', 'Operations')
x = make_expense(e[0], vendor1, 'Infrastructure', 'HVAC maintenance contract Q1 2026',
                 38000, pdf_bytes=pdf, pdf_name='ops_hvac.pdf', scenario='approved')
print(f"    {x.ref_no} | APPROVED | ₹{x.total_amount}")

pdf = sml_pdf or make_pdf_bytes('Office Security', 28000, 'SML Security', 'OPS-SEC-001', 'Operations')
x = make_expense(e[1], vendor2, 'Professional Services', 'Office security services - March 2026',
                 28000, pdf_bytes=pdf, pdf_name='ops_security.pdf', invoice_number='SML-OPS-001',
                 scenario='fin_pending')
print(f"    {x.ref_no} | HOD Approved→Finance | ₹{x.total_amount}")

pdf = make_pdf_bytes('Conference Room Renovation', 125000, 'Bajaj Electricals', 'OPS-REN-001', 'Operations')
x = make_expense(e[0], vendor1, 'Infrastructure', 'Conference room renovation - floor 3',
                 125000, pdf_bytes=pdf, pdf_name='ops_renovation.pdf', scenario='hod_pending')
print(f"    {x.ref_no} | Submitted→HOD Pending | ₹{x.total_amount}")

pdf = make_pdf_bytes('Logistics Services', 18500, 'SML Security', 'OPS-LOG-001', 'Operations')
x = make_expense(e[1], vendor2, 'Courier & Logistics', 'Bulk courier and logistics - March',
                 18500, pdf_bytes=pdf, pdf_name='ops_logistics.pdf', scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount}")

# ── Marketing ─────────────────────────────────────────────────────────────────
print("\n  Marketing:")
e = employees['Marketing']

pdf = make_pdf_bytes('Digital Advertising', 75000, 'Bajaj Electricals', 'MKT-ADS-001', 'Marketing')
x = make_expense(e[0], vendor1, 'Marketing & Events', 'Google and Meta ads campaign - March 2026',
                 75000, pdf_bytes=pdf, pdf_name='mkt_digital_ads.pdf', scenario='approved')
print(f"    {x.ref_no} | APPROVED | ₹{x.total_amount}")

pdf = make_pdf_bytes('Product Launch Event', 110000, 'SML Security', 'MKT-EVT-001', 'Marketing')
x = make_expense(e[1], vendor2, 'Marketing & Events', 'Product launch event management fees',
                 110000, pdf_bytes=pdf, pdf_name='mkt_event.pdf', scenario='approved_with_query')
print(f"    {x.ref_no} | APPROVED+Query | ₹{x.total_amount}")

pdf = make_pdf_bytes('Brand Design Agency', 48000, 'Bajaj Electricals', 'MKT-DES-001', 'Marketing')
x = make_expense(e[0], vendor1, 'Professional Services', 'Brand refresh design agency fees',
                 48000, pdf_bytes=pdf, pdf_name='mkt_design.pdf', scenario='pending')
print(f"    {x.ref_no} | PENDING | ₹{x.total_amount}")

pdf = make_pdf_bytes('Influencer Campaign', 65000, 'SML Security', 'MKT-INF-001', 'Marketing')
x = make_expense(e[1], vendor2, 'Marketing & Events', 'Influencer marketing campaign Q1 2026',
                 65000, pdf_bytes=pdf, pdf_name='mkt_influencer.pdf', scenario='rejected')
print(f"    {x.ref_no} | REJECTED | ₹{x.total_amount}")

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("SEED COMPLETE — SUMMARY")
print("="*60)
total = Expense.objects.count()
approved = Expense.objects.filter(_status='APPROVED').count()
rejected = Expense.objects.filter(_status='REJECTED').count()
pending  = Expense.objects.filter(_status__startswith='PENDING').count()
print(f"  Expenses   : {total}  (Approved={approved}, Rejected={rejected}, Pending={pending})")
print(f"  Users      : {User.objects.count()}")
print(f"  Vendors    : {Vendor.objects.count()}")
print(f"  Departments: {Department.objects.count()}")
print(f"  Budgets    : {Budget.objects.count()}")
print()
print("LOGIN CREDENTIALS")
print("-"*40)
print("  cfo_admin   / Admin@123   (CFO, superuser)")
print("  fin_admin   / Admin@123   (Finance Admin, grade 4)")
print("  fin_mgr     / Admin@123   (Finance Manager, grade 3)")
print()
print("HODs (grade 2):")
for dn, info in dept_user_data.items():
    print(f"  {info['hod'][0]:12s} / Admin@123  ({dn})")
print()
print("Employees (grade 1):")
for dn, info in dept_user_data.items():
    print(f"  {info['emps'][0][0]:12s} / Admin@123  ({dn})")
    print(f"  {info['emps'][1][0]:12s} / Admin@123  ({dn})")
print()
print("Vendors:")
print("  accounts@bajajelectricals.com  (Bajaj Electricals Ltd)")
print("  billing@smlsecurity.com        (SML Security Services Pvt Ltd)")
