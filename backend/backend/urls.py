from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from apps.accounts.views import message_detail

def home_view(request):
    return JsonResponse({
        "message": "Welcome to Neonflake Backend API!",
        "available_endpoints": {
            "auth": "/api/auth/",
            "addresses": "/api/addresses/",
            "password_reset": "/api/password-reset/",
            "change_password": "/api/change-password/",
            "viewprofile": "/api/viewprofile/",
        }
    })

urlpatterns = [
    path("", home_view),  # ✅ This handles /
    path("dj-admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/addresses/", include("apps.addresses.urls")),
    path("api/password-reset/", include("apps.password_reset.urls")),
    path("api/change-password/", include("apps.change_password.urls")),
    path("api/viewprofile/", include("apps.viewprofile.urls")),
    path("api/auth/messages/<str:type>/<str:code>/", message_detail, name="message_detail"),

]
