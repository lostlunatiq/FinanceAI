
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
os.environ['USE_SQLITE'] = 'true'
django.setup()

from apps.core.models import User, Department, Vendor
from django.contrib.auth.models import Group

def create_users():
    finance, _ = Department.objects.get_or_create(name="Finance")
    engineering, _ = Department.objects.get_or_create(name="Engineering")
    
    # Employee
    emp, created = User.objects.get_or_create(
        username="employee1",
        defaults={
            "email": "employee1@demo.financeai.in",
            "first_name": "Employee",
            "last_name": "One",
            "employee_grade": 1,
            "department": engineering,
        }
    )
    emp.set_password("demo1234")
    emp.save()
    print(f"User employee1 {'created' if created else 'updated'}")

    # Vendor User
    vendor_user, created = User.objects.get_or_create(
        username="vendor1",
        defaults={
            "email": "vendor1@demo.financeai.in",
            "first_name": "Vendor",
            "last_name": "One",
            "employee_grade": 1,
        }
    )
    vendor_user.set_password("demo1234")
    vendor_user.save()
    print(f"User vendor1 {'created' if created else 'updated'}")

    # Vendor Profile
    vendor_prof, created = Vendor.objects.get_or_create(
        name="Global Logistics Corp",
        defaults={
            "email": "ap@globallogistics.com",
            "status": "ACTIVE",
            "is_approved": True,
            "user": vendor_user,
        }
    )
    if not vendor_prof.user:
        vendor_prof.user = vendor_user
        vendor_prof.save()
    print(f"Vendor profile Global Logistics Corp {'created' if created else 'updated'}")

if __name__ == "__main__":
    create_users()
