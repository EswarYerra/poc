# backend/apps/accounts/serializers.py
from rest_framework import serializers
from django.apps import apps as django_apps
from .models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "role_display",
            "date_joined",
            "address",
        ]
        read_only_fields = ["id", "date_joined"]

        # 🧩 disable Django's built-in UniqueValidator (we handle manually)
        extra_kwargs = {
            "username": {"validators": []},
            "email": {"validators": []},
        }

    def validate_username(self, value):
        """Prevent duplicate username validation when editing same user."""
        user_id = self.instance.id if self.instance else None
        if User.objects.exclude(id=user_id).filter(username=value).exists():
            # return standardized message code
            raise serializers.ValidationError("EP016")
        return value

    def validate_email(self, value):
        """Prevent duplicate email validation when editing same user."""
        user_id = self.instance.id if self.instance else None
        if User.objects.exclude(id=user_id).filter(email=value).exists():
            raise serializers.ValidationError("ES003")
        return value

    def get_role_display(self, obj):
        return "Admin" if (obj.is_superuser or obj.is_staff) else "User"

    def get_address(self, obj):
        try:
            AddressModel = django_apps.get_model("addresses", "Address")
        except LookupError:
            return {}

        try:
            addr = None
            if "user" in [f.name for f in AddressModel._meta.fields]:
                addr = AddressModel.objects.filter(user=obj).first()
            elif "owner" in [f.name for f in AddressModel._meta.fields]:
                addr = AddressModel.objects.filter(owner=obj).first()
            else:
                try:
                    addr = AddressModel.objects.filter(user_id=obj.id).first()
                except Exception:
                    addr = None

            if not addr:
                return {}

            out = {}
            for field in ("address_line", "address1", "address", "street", "line1", "house", "flat"):
                if hasattr(addr, field):
                    val = getattr(addr, field)
                    if val:
                        out["address_line"] = val
                        break
            for name in ("city", "district", "state", "country", "pincode", "zip", "postal_code"):
                if hasattr(addr, name):
                    val = getattr(addr, name)
                    if val:
                        out[name] = val
            if not out:
                for f in addr._meta.fields:
                    fname = f.name
                    if fname in ("id", "user_id", "owner_id"):
                        continue
                    try:
                        val = getattr(addr, fname)
                        if val is None:
                            continue
                        if hasattr(val, "__class__") and not isinstance(val, (str, int, float, bool)):
                            continue
                        out[fname] = val
                    except Exception:
                        continue
            return out
        except Exception:
            return {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role"] = "admin" if (instance.is_superuser or instance.is_staff) else "user"
        if data.get("address") is None:
            data["address"] = {}
        return data



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "password",
        ]

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", "").strip().lower(),
            phone=validated_data.get("phone", ""),
            first_name=validated_data.get("first_name", "").strip(),
            last_name=validated_data.get("last_name", "").strip(),
            password=validated_data["password"],
        )
        return user