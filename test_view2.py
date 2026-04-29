import json
from django.test import RequestFactory
from rest_framework.request import Request
from apps.core.auth_views import UserDetailView
from apps.core.models import User
from django.contrib.auth.models import Group

u = User.objects.filter(is_superuser=True).first()
target_u = User.objects.exclude(is_superuser=True).first()
g, _ = Group.objects.get_or_create(name='TestGroup')

target_u.groups.clear()

factory = RequestFactory()
request = factory.patch('/api/v1/auth/users/{}/'.format(target_u.id), data=json.dumps({"groups": [g.id]}), content_type='application/json')

# Important: Need to authenticate using force_authenticate for rest_framework
from rest_framework.test import force_authenticate
from rest_framework.views import APIView

view = UserDetailView.as_view()
force_authenticate(request, user=u)

response = view(request, pk=target_u.id)

print("STATUS CODE:", response.status_code)
if hasattr(response, 'data'):
    print("DATA GROUPS:", response.data.get('groups'))
print("ACTUAL GROUPS SAVED:", target_u.groups.all())
