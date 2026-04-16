import os
import django
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.core.models import Department
from apps.accounts.models import UserRole

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo data with departments and users for all roles'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Seeding demo data...'))
        
        # Create departments
        departments_data = [
            {'name': 'Engineering', 'cost_centre_code': 'ENG001'},
            {'name': 'Finance', 'cost_centre_code': 'FIN001'},
            {'name': 'Operations', 'cost_centre_code': 'OPS001'},
            {'name': 'Sales', 'cost_centre_code': 'SALES001'},
            {'name': 'Marketing', 'cost_centre_code': 'MKT001'},
        ]
        
        departments = {}
        for dept_data in departments_data:
            dept, created = Department.objects.get_or_create(
                name=dept_data['name'],
                defaults=dept_data
            )
            departments[dept_data['name']] = dept
            if created:
                self.stdout.write(f'  Created department: {dept.name}')
        
        # Demo users with different roles
        demo_users = [
            # Vendor user (external)
            {
                'email': 'vendor@demo.com',
                'first_name': 'Raj',
                'last_name': 'Sharma',
                'role': UserRole.VENDOR,
                'department': None,
                'password': 'hackathon2026',
            },
            # Employee L1
            {
                'email': 'l1@demo.com',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'role': UserRole.EMP_L1,
                'department': departments['Engineering'],
                'password': 'hackathon2026',
            },
            # Employee L2
            {
                'email': 'l2@demo.com',
                'first_name': 'Amit',
                'last_name': 'Kumar',
                'role': UserRole.EMP_L2,
                'department': departments['Engineering'],
                'password': 'hackathon2026',
            },
            # Department Head (HOD)
            {
                'email': 'hod@demo.com',
                'first_name': 'Deepak',
                'last_name': 'Verma',
                'role': UserRole.HOD,
                'department': departments['Engineering'],
                'password': 'hackathon2026',
            },
            # Finance L1
            {
                'email': 'finl1@demo.com',
                'first_name': 'Anjali',
                'last_name': 'Singh',
                'role': UserRole.FIN_L1,
                'department': departments['Finance'],
                'password': 'hackathon2026',
            },
            # Finance L2
            {
                'email': 'finl2@demo.com',
                'first_name': 'Rahul',
                'last_name': 'Mehta',
                'role': UserRole.FIN_L2,
                'department': departments['Finance'],
                'password': 'hackathon2026',
            },
            # CFO
            {
                'email': 'cfo@demo.com',
                'first_name': 'Sanjay',
                'last_name': 'Gupta',
                'role': UserRole.CFO,
                'department': departments['Finance'],
                'password': 'hackathon2026',
            },
            # CEO
            {
                'email': 'ceo@demo.com',
                'first_name': 'Neha',
                'last_name': 'Reddy',
                'role': UserRole.CEO,
                'department': departments['Operations'],
                'password': 'hackathon2026',
            },
            # Admin
            {
                'email': 'admin@demo.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': UserRole.ADMIN,
                'department': departments['Operations'],
                'password': 'hackathon2026',
                'is_staff': True,
                'is_superuser': True,
            },
            # Auditor
            {
                'email': 'auditor@demo.com',
                'first_name': 'Vikram',
                'last_name': 'Joshi',
                'role': UserRole.AUDITOR,
                'department': departments['Finance'],
                'password': 'hackathon2026',
            },
            # External CA
            {
                'email': 'ca@demo.com',
                'first_name': 'External',
                'last_name': 'CA',
                'role': UserRole.EXTERNAL_CA,
                'department': None,
                'password': 'hackathon2026',
            },
        ]
        
        # Create or update users
        for user_data in demo_users:
            email = user_data['email']
            defaults = {k: v for k, v in user_data.items() if k != 'email'}
            password = defaults.pop('password', 'hackathon2026')
            
            try:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults=defaults
                )
                
                if created or not user.check_password(password):
                    user.set_password(password)
                    user.save()
                
                if created:
                    self.stdout.write(f'  Created user: {email} ({user.get_role_display()})')
                else:
                    self.stdout.write(f'  Updated user: {email} ({user.get_role_display()})')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error creating user {email}: {str(e)}'))
        
        # Set department heads
        departments['Engineering'].head = User.objects.get(email='hod@demo.com')
        departments['Engineering'].save()
        
        departments['Finance'].head = User.objects.get(email='cfo@demo.com')
        departments['Finance'].save()
        
        departments['Operations'].head = User.objects.get(email='ceo@demo.com')
        departments['Operations'].save()
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))
        self.stdout.write('\nDemo users created:')
        self.stdout.write('  Email: vendor@demo.com, Password: hackathon2026 (VENDOR)')
        self.stdout.write('  Email: l1@demo.com, Password: hackathon2026 (EMP_L1)')
        self.stdout.write('  Email: l2@demo.com, Password: hackathon2026 (EMP_L2)')
        self.stdout.write('  Email: hod@demo.com, Password: hackathon2026 (HOD)')
        self.stdout.write('  Email: finl1@demo.com, Password: hackathon2026 (FIN_L1)')
        self.stdout.write('  Email: finl2@demo.com, Password: hackathon2026 (FIN_L2)')
        self.stdout.write('  Email: cfo@demo.com, Password: hackathon2026 (CFO)')
        self.stdout.write('  Email: ceo@demo.com, Password: hackathon2026 (CEO)')
        self.stdout.write('  Email: admin@demo.com, Password: hackathon2026 (ADMIN)')
        self.stdout.write('  Email: auditor@demo.com, Password: hackathon2026 (AUDITOR)')
        self.stdout.write('  Email: ca@demo.com, Password: hackathon2026 (EXTERNAL_CA)')