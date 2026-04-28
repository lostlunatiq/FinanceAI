from apps.core.models import User
from django.contrib.auth.models import Group
from apps.core.auth_serializers import UserProfileSerializer

u = User.objects.first()
g, _ = Group.objects.get_or_create(name='TestGroup')

s = UserProfileSerializer(u, data={"groups": [g.id]}, partial=True)
print("IS VALID:", s.is_valid())
if not s.is_valid():
    print("ERRORS:", s.errors)
else:
    s.save()
    print("GROUPS SAVED:", u.groups.all())
