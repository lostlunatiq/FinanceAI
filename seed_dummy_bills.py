import os
import django
from datetime import datetime, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
os.environ['USE_SQLITE'] = 'true'
django.setup()

from apps.core.models import User, Vendor
from apps.invoices.models import Expense

def seed():
    vendor1_user = User.objects.get(username="vendor1")
    vendor_prof = Vendor.objects.get(user=vendor1_user)
    
    # Delete old ones
    Expense.objects.filter(vendor=vendor_prof).delete()

    now = datetime.now()

    # Bill 1: Discount eligible (Pay early to save)
    e1 = Expense.objects.create(
        vendor=vendor_prof,
        submitted_by=vendor1_user,
        total_amount=Decimal('45000.00'),
        pre_gst_amount=Decimal('45000.00'),
        _status='APPROVED',
        business_purpose='Cloud Services License (Annual)',
        invoice_date=(now - timedelta(days=5)).date(),  # 25 days until net-30 due
        ref_no='INV-2026-001',
    )
    e1._force_status("APPROVED")

    # Bill 2: Late Fee risk (Overdue or due soon)
    e2 = Expense.objects.create(
        vendor=vendor_prof,
        submitted_by=vendor1_user,
        total_amount=Decimal('120000.00'),
        pre_gst_amount=Decimal('120000.00'),
        _status='APPROVED',
        business_purpose='Server Rack Installation',
        invoice_date=(now - timedelta(days=32)).date(), # 2 days overdue
        ref_no='INV-2026-002',
    )
    e2._force_status("APPROVED")

    # Bill 3: Batch optimal
    e3 = Expense.objects.create(
        vendor=vendor_prof,
        submitted_by=vendor1_user,
        total_amount=Decimal('18500.00'),
        pre_gst_amount=Decimal('18500.00'),
        _status='APPROVED',
        business_purpose='Executive Flights',
        invoice_date=(now - timedelta(days=20)).date(), # 10 days left
        ref_no='INV-2026-003',
    )
    e3._force_status("APPROVED")

    print("Seeded 3 dummy APPROVED vendor bills for payment optimisation.")

if __name__ == "__main__":
    seed()
