import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import User
from django.contrib.auth.models import Group
from apps.core.auth_serializers import UserProfileSerializer

u = User.objects.first()
g, _ = Group.objects.get_or_create(name='TestGroup')

s = UserProfileSerializer(u, data={"groups": [g.id]}, partial=True)
print(s.is_valid())
if not s.is_valid():
    print(s.errors)
else:
    s.save()
    print("Saved groups:", u.groups.all())
