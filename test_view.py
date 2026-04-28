import json
import django
from django.test import RequestFactory
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.auth_views import UserDetailView
from apps.core.models import User
from django.contrib.auth.models import Group

u = User.objects.filter(is_superuser=True).first()
target_u = User.objects.exclude(is_superuser=True).first()
g, _ = Group.objects.get_or_create(name='TestGroup')

target_u.groups.clear()

factory = RequestFactory()
request = factory.patch('/api/v1/auth/users/{}/'.format(target_u.id), data=json.dumps({"groups": [g.id]}), content_type='application/json')
request.user = u
from rest_framework.request import Request
drf_request = Request(request)

view = UserDetailView.as_view()
response = view(request, pk=target_u.id)

print("STATUS CODE:", response.status_code)
if hasattr(response, 'data'):
    print("DATA:", response.data)
print("ACTUAL GROUPS SAVED:", target_u.groups.all())
