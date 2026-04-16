# apps/core/urls.py
from django.urls import path
from . import auth_views, file_views

urlpatterns = [
    # Auth
    path("auth/login/", auth_views.LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", auth_views.RefreshTokenView.as_view(), name="auth-refresh"),
    path("auth/me/", auth_views.MeView.as_view(), name="auth-me"),
    path("auth/register/", auth_views.RegisterView.as_view(), name="auth-register"),
    path("auth/users/", auth_views.UserListView.as_view(), name="user-list"),
    path("auth/users/<uuid:pk>/", auth_views.UserDetailView.as_view(), name="user-detail"),
    # Files
    path("files/upload/", file_views.FileUploadView.as_view(), name="file-upload"),
    path("files/ocr/", file_views.OCRSyncView.as_view(), name="file-ocr-sync"),
    path("files/<uuid:pk>/", file_views.FileDownloadView.as_view(), name="file-download"),
    # Audit
    path("audit/", auth_views.AuditLogListView.as_view(), name="audit-list"),
    # NL Query
    path("nl-query/", auth_views.NLQueryView.as_view(), name="nl-query"),
]
