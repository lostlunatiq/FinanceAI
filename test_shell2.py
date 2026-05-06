from apps.core.auth_serializers import UserProfileSerializer
from apps.core.models import User

u = User.objects.first()
print(UserProfileSerializer(u).data)
