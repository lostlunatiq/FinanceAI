from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .auth_serializers import LoginSerializer, UserProfileSerializer, RegisterUserSerializer
from .permissions import IsFinanceAdmin


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Returns JWT access + refresh tokens along with user profile.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        # Add custom claims
        refresh["role"] = user.role
        refresh["username"] = user.username

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(APIView):
    """
    POST /api/v1/auth/refresh/
    Refresh JWT access token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response(
                {"access": str(refresh.access_token)}, status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class MeView(APIView):
    """
    GET  /api/v1/auth/me/   — Current user profile
    PATCH /api/v1/auth/me/  — Update profile (name only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Admin-only user creation.
    """

    permission_classes = [IsAuthenticated, IsFinanceAdmin]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserProfileSerializer(user).data, status=status.HTTP_201_CREATED
        )
