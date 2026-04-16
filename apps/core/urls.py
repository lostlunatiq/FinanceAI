# apps/core/urls.py
from django.urls import path
from . import auth_views, file_views

urlpatterns = [
    # Auth
    path("auth/login/", auth_views.LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", auth_views.RefreshTokenView.as_view(), name="auth-refresh"),
    path("auth/me/", auth_views.MeView.as_view(), name="auth-me"),
    path("auth/register/", auth_views.RegisterView.as_view(), name="auth-register"),
    # Files
    path("files/upload/", file_views.FileUploadView.as_view(), name="file-upload"),
    path("files/<uuid:pk>/", file_views.FileDownloadView.as_view(), name="file-download"),
]
