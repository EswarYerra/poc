from django.urls import path
from .views import ProfileAPIView
from . import admin_views  # import admin views for admin-only routes

urlpatterns = [
    # ----------------------------
    # 👤 User (Self) Routes
    # ----------------------------
    path("auth/profile/", ProfileAPIView.as_view(), name="user-profile"),

    # ----------------------------
    # 🛠️ Admin User Management
    # ----------------------------
    path("admin/users/", admin_views.AdminUserListCreateView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", admin_views.AdminUserDetailView.as_view(), name="admin-user-detail"),

    # ----------------------------
    # 🏠 Admin Address (UserProfile) Management
    # ----------------------------
    path("admin/addresses/", admin_views.AdminAddressListCreateView.as_view(), name="admin-addresses"),
    path("admin/addresses/<int:pk>/", admin_views.AdminAddressRetrieveUpdateView.as_view(), name="admin-address-detail"),

    # ----------------------------
    # ✅ Optional: Check if a user has a profile
    # ----------------------------
    path("admin/check-address/", admin_views.admin_check_address, name="admin-check-address"),
]
