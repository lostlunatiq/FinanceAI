import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import requests

User = get_user_model()
u = User.objects.get(username="arjun.sharma")
token = str(RefreshToken.for_user(u).access_token)

print("Calling API...")
try:
    r = requests.get("http://localhost:8008/api/v1/invoices/forecasting/cashflow/?days=90", headers={"Authorization": f"Bearer {token}"})
    print(r.status_code)
    print(r.text[:200])
except Exception as e:
    print("Exception:", e)
