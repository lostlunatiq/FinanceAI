from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshView.as_view(), name='refresh'),
    path('verify/', TokenVerifyView.as_view(), name='verify'),
    path('me/', views.MeView.as_view(), name='me'),
    path('whoami/', views.WhoamiView.as_view(), name='whoami'),
    
    # User management (admin only)
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:id>/', views.UserDetailView.as_view(), name='user-detail'),
    
    # Department management
    path('departments/', views.DepartmentListView.as_view(), name='department-list'),
    path('departments/<uuid:id>/', views.DepartmentDetailView.as_view(), name='department-detail'),
]