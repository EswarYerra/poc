# backend/apps/accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import get_messages
from .views_constants import ConstantsAPIView

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("register/", views.register_user, name="register_user"),
    path("check-username/", views.check_username, name="check_username"),
    path("check-email/", views.check_email, name="check_email"),
    path("token/", views.CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", views.ProfileAPIView.as_view(), name="profile_view"),
    path("admin/users/", views.AdminUserListCreateAPIView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", views.AdminUserUpdateDeleteAPIView.as_view(), name="admin-user-detail"),
    path("admin/stats/", views.AdminUserStatsAPIView.as_view(), name="admin-user-stats"),
    
    # 🟢 message endpoints
    path("messages/", views.get_message_tables, name="get_message_tables"),
    path("messages/", get_messages, name="get-messages"),

    # 🟢 constants endpoint
    path("constants/", ConstantsAPIView.as_view(), name="constants"),
]
