import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# Add gstin to expense if it does not exist
with connection.cursor() as cursor:
    try:
        cursor.execute("ALTER TABLE invoices_expense ADD COLUMN gstin VARCHAR(15) DEFAULT '' NOT NULL;")
        print("Added gstin to invoices_expense")
    except Exception as e:
        print(e)
