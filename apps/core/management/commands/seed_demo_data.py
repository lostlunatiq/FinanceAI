from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import datetime, timedelta
from decimal import Decimal
import random

class Command(BaseCommand):
    help = 'Seed demo data for all personas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('🌱 Tijori FinanceAI - Demo Data Seeding'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))

        personas = {
            'arjun.sharma': {'full_name': 'Arjun Sharma', 'email': 'arjun.sharma@company.com', 'role': 'CFO'},
            'priya.nair': {'full_name': 'Priya Nair', 'email': 'priya.nair@company.com', 'role': 'Finance Admin'},
            'vikram.mehta': {'full_name': 'Vikram Mehta', 'email': 'vikram.mehta@company.com', 'role': 'Finance Manager'},
            'divya.krishnan': {'full_name': 'Divya Krishnan', 'email': 'divya.krishnan@company.com', 'role': 'HOD'},
            'rohit.kapoor': {'full_name': 'Rohit Kapoor', 'email': 'rohit.kapoor@company.com', 'role': 'HOD'},
            'sunita.rao': {'full_name': 'Sunita Rao', 'email': 'sunita.rao@company.com', 'role': 'HOD'},
            'anil.desai': {'full_name': 'Anil Desai', 'email': 'anil.desai@company.com', 'role': 'HOD'},
            'neha.gupta': {'full_name': 'Neha Gupta', 'email': 'neha.gupta@company.com', 'role': 'Employee'},
            'rahul.joshi': {'full_name': 'Rahul Joshi', 'email': 'rahul.joshi@company.com', 'role': 'Employee'},
            'kavita.iyer': {'full_name': 'Kavita Iyer', 'email': 'kavita.iyer@company.com', 'role': 'Employee'},
            'sanjay.reddy': {'full_name': 'Sanjay Reddy', 'email': 'sanjay.reddy@company.com', 'role': 'Employee'},
        }

        self.stdout.write('📝 Creating users and profiles...')
        for username, info in personas.items():
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

            if created:
                self.stdout.write(f"  ✓ Created: {username} ({info['full_name']} - {info['role']})")
            else:
                self.stdout.write(f"  ✓ Updated: {username}")

        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✅ Demo users created successfully!'))
        self.stdout.write(self.style.SUCCESS('='*60))

        self.stdout.write(self.style.WARNING('\n🔑 Login Credentials:'))
        self.stdout.write('─' * 60)
        for i, (username, info) in enumerate(list(personas.items())[:5]):
            self.stdout.write(f"  {username:20} | {info['role']:20} | demo1234")
        if len(personas) > 5:
            self.stdout.write(f"  ... and {len(personas)-5} more users")
        self.stdout.write('─' * 60 + '\n')
