# backend/apps/addresses/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ✅ Check if user has any address (used after login)
    path("check_address/", views.check_address, name="check-address"),
    path("me/", views.get_my_address, name="get_my_address"),

    # ✅ List / Create addresses
    path("", views.AddressListCreateView.as_view(), name="address-list-create"),

    # ✅ Retrieve / Update address by ID
    path("<int:pk>/", views.AddressRetrieveUpdateView.as_view(), name="address-detail"),
]
