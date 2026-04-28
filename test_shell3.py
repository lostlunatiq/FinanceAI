import json
from django.test import RequestFactory
from apps.core.auth_views import UserDetailView
from apps.core.models import User
from django.contrib.auth.models import Group

u = User.objects.filter(is_superuser=True).first()
target_u = User.objects.exclude(is_superuser=True).first()
g, _ = Group.objects.get_or_create(name='TestGroup')

factory = RequestFactory()
request = factory.patch('/api/v1/auth/users/{}/'.format(target_u.id), data=json.dumps({"groups": [g.id]}), content_type='application/json')
request.user = u

view = UserDetailView.as_view()
response = view(request, pk=target_u.id)
print("STATUS CODE:", response.status_code)
print("DATA:", response.data)
