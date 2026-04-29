from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', views.NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('mark-all-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-all-read'),
    path('<uuid:pk>/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
]
