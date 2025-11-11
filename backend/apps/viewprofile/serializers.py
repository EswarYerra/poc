# apps/viewprofile/serializers.py
from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id", "user", "name", "phone", "email", "house", "street", "landmark",
            "area", "district", "state", "country", "pincode", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
