#!/usr/bin/env python3
"""
Demo data seeding script for Tijori FinanceAI
Seeds synthetic and realistic data for all personas
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.core.models import UserProfile, Budget
from apps.invoices.models import Bill, Expense, Vendor

# Persona data
PERSONAS = {
    'arjun.sharma': {
        'full_name': 'Arjun Sharma',
        'email': 'arjun.sharma@company.com',
        'role': 'CFO',
        'grade': 'G5',
    },
    'priya.nair': {
        'full_name': 'Priya Nair',
        'email': 'priya.nair@company.com',
        'role': 'Finance Admin',
        'grade': 'G4',
    },
    'vikram.mehta': {
        'full_name': 'Vikram Mehta',
        'email': 'vikram.mehta@company.com',
        'role': 'Finance Manager',
        'grade': 'G3',
    },
    'divya.krishnan': {
        'full_name': 'Divya Krishnan',
        'email': 'divya.krishnan@company.com',
        'role': 'HOD',
        'grade': 'G2',
        'department': 'Engineering',
    },
    'rohit.kapoor': {
        'full_name': 'Rohit Kapoor',
        'email': 'rohit.kapoor@company.com',
        'role': 'HOD',
        'grade': 'G2',
        'department': 'Operations',
    },
    'sunita.rao': {
        'full_name': 'Sunita Rao',
        'email': 'sunita.rao@company.com',
        'role': 'HOD',
        'grade': 'G2',
        'department': 'Human Resources',
    },
    'anil.desai': {
        'full_name': 'Anil Desai',
        'email': 'anil.desai@company.com',
        'role': 'HOD',
        'grade': 'G2',
        'department': 'Marketing',
    },
    'neha.gupta': {
        'full_name': 'Neha Gupta',
        'email': 'neha.gupta@company.com',
        'role': 'Employee',
        'grade': 'G1',
        'department': 'Engineering',
    },
    'rahul.joshi': {
        'full_name': 'Rahul Joshi',
        'email': 'rahul.joshi@company.com',
        'role': 'Employee',
        'grade': 'G1',
        'department': 'Sales',
    },
    'kavita.iyer': {
        'full_name': 'Kavita Iyer',
        'email': 'kavita.iyer@company.com',
        'role': 'Employee',
        'grade': 'G1',
        'department': 'Marketing',
    },
    'sanjay.reddy': {
        'full_name': 'Sanjay Reddy',
        'email': 'sanjay.reddy@company.com',
        'role': 'Employee',
        'grade': 'G1',
        'department': 'Operations',
    },
}

VENDORS = [
    {
        'name': 'Infosys Limited',
        'email': 'ap@infosys.com',
        'contact': '9876543210',
        'bank_account': 'INFY0001234567',
        'upi': 'infosys@hdfc',
    },
    {
        'name': 'Staples India',
        'email': 'billing@staples.in',
        'contact': '9876543211',
        'bank_account': 'STAPLES98765',
        'upi': 'staples@icici',
    },
    {
        'name': 'AWS India',
        'email': 'billing@aws.amazon.com',
        'contact': '9876543212',
        'bank_account': 'AWSIND2024',
        'upi': 'aws@axis',
    },
    {
        'name': 'Microsoft India',
        'email': 'invoices@microsoft.com',
        'contact': '9876543213',
        'bank_account': 'MSFT0024567',
        'upi': 'microsoft@hdfc',
    },
    {
        'name': 'Adobe Systems India',
        'email': 'billing@adobe.com',
        'contact': '9876543214',
        'bank_account': 'ADOBE123456',
        'upi': 'adobe@icici',
    },
]

MERCHANTS = [
    'Swiggy', 'Uber', 'Oyo Rooms', 'MakeMyTrip', 'BookMyShow',
    'Amazon Business', 'Flipkart', 'Starbucks', 'ITC Hotels',
    'IndiGo Airlines', 'Decathlon', 'FedEx', 'Goibibo', 'Agoda',
    'Treebo Hotels', 'Red Bus', 'Uber Eats'
]

CATEGORIES = [
    'Travel',
    'Software & Licences',
    'Professional Services',
    'Office Supplies',
    'Marketing & Events',
    'Infrastructure',
    'HR & Recruitment',
    'Legal & Compliance',
]

def create_users():
    """Create or update user accounts for all personas"""
    created_count = 0
    for username, info in PERSONAS.items():
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': info['email'],
                'first_name': info['full_name'].split()[0],
                'last_name': info['full_name'].split()[-1],
            }
        )
        user.set_password('demo1234')
        user.save()

        # Create or update profile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = info['role']
        profile.grade = info['grade']
        profile.department = info.get('department', 'Finance')
        profile.save()

        if created:
            created_count += 1
            print(f"✓ Created user: {username} ({info['full_name']})")
        else:
            print(f"✓ Updated user: {username}")

    return created_count

def create_vendors():
    """Create vendor records"""
    created_count = 0
    for vendor_data in VENDORS:
        vendor, created = Vendor.objects.get_or_create(
            name=vendor_data['name'],
            defaults={
                'email': vendor_data['email'],
                'phone': vendor_data['contact'],
                'bank_account': vendor_data['bank_account'],
                'upi_id': vendor_data['upi'],
                'status': 'ACTIVE',
            }
        )
        if created:
            created_count += 1
            print(f"✓ Created vendor: {vendor_data['name']}")

    return created_count

def create_expenses():
    """Create expense records for employees"""
    employees = User.objects.filter(userprofile__role='Employee')
    created_count = 0

    for employee in employees:
        for i in range(random.randint(2, 5)):
            amount = Decimal(str(random.randint(1000, 45000)))
            days_ago = random.randint(1, 30)
            invoice_date = datetime.now().date() - timedelta(days=days_ago)

            expense, created = Expense.objects.get_or_create(
                user=employee,
                created_at__date=invoice_date,
                amount=amount,
                defaults={
                    'expense_category': random.choice(CATEGORIES),
                    'description': f'Receipt from {random.choice(MERCHANTS)}',
                    'invoice_date': invoice_date,
                    'status': random.choice(['PENDING_L1', 'APPROVED', 'PAID']),
                }
            )
            if created:
                created_count += 1

    print(f"✓ Created {created_count} expenses for {len(employees)} employees")
    return created_count

def create_bills():
    """Create bills/invoices in various states"""
    vendors = list(Vendor.objects.all())
    created_count = 0

    statuses = ['PENDING_L1', 'PENDING_L2', 'PENDING_HOD', 'APPROVED', 'PAID']

    for vendor in vendors:
        for i in range(random.randint(3, 7)):
            amount = Decimal(str(random.randint(50000, 500000)))
            days_ago = random.randint(1, 45)
            invoice_date = datetime.now().date() - timedelta(days=days_ago)

            bill, created = Bill.objects.get_or_create(
                vendor=vendor,
                invoice_date=invoice_date,
                total_amount=amount,
                defaults={
                    'status': random.choice(statuses),
                    'description': f'Invoice from {vendor.name}',
                    'gst_amount': amount * Decimal('0.18'),
                }
            )
            if created:
                created_count += 1

    print(f"✓ Created {created_count} bills across {len(vendors)} vendors")
    return created_count

def create_budgets():
    """Create budget allocations"""
    departments = ['Engineering', 'Operations', 'Marketing', 'Human Resources', 'Sales']
    created_count = 0

    for dept in departments:
        budget, created = Budget.objects.get_or_create(
            name=f'{dept} Budget FY2024-25',
            defaults={
                'department': dept,
                'total_amount': Decimal(str(random.randint(500000, 5000000))),
                'alert_threshold': 80,
                'critical_threshold': 95,
                'fiscal_year': 2024,
            }
        )
        if created:
            created_count += 1
            print(f"✓ Created budget: {dept}")

    return created_count

def main():
    print("\n" + "="*60)
    print("🌱 Tijori FinanceAI - Demo Data Seeding")
    print("="*60 + "\n")

    try:
        print("📝 Creating users and profiles...")
        create_users()

        print("\n🏢 Creating vendors...")
        create_vendors()

        print("\n💰 Creating budgets...")
        create_budgets()

        print("\n📄 Creating expenses...")
        create_expenses()

        print("\n📋 Creating bills...")
        create_bills()

        print("\n" + "="*60)
        print("✅ Demo data seeded successfully!")
        print("="*60)
        print("\n🔑 Login Credentials:")
        print("─" * 60)
        for username in list(PERSONAS.keys())[:5]:
            info = PERSONAS[username]
            print(f"  {username:20} | {info['role']:20} | demo1234")
        print(f"  ... and {len(PERSONAS)-5} more users")
        print("─" * 60 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
