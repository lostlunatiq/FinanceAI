from apps.core.models import User
from apps.core.auth_serializers import UserProfileSerializer

u = User.objects.first()
print(UserProfileSerializer(u).data)
