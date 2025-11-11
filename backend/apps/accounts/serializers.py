# backend/apps/accounts/serializers.py
from rest_framework import serializers
from django.apps import apps as django_apps
from .models import User

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
            "address",  # include address in profile payload
        ]
        read_only_fields = ["id", "date_joined"]

    def get_role_display(self, obj):
        return "Admin" if (obj.is_superuser or obj.is_staff) else "User"

    def get_address(self, obj):
        """
        Return a minimal address dict if an Address model exists and an address is set.
        Returns {} if no address found or addresses app/model is not present.
        """
        try:
            AddressModel = django_apps.get_model('addresses', 'Address')
        except LookupError:
            return {}

        try:
            # attempt common relation names
            addr = None
            # If Address has 'user' FK:
            if 'user' in [f.name for f in AddressModel._meta.fields]:
                addr = AddressModel.objects.filter(user=obj).first()
            elif 'owner' in [f.name for f in AddressModel._meta.fields]:
                addr = AddressModel.objects.filter(owner=obj).first()
            else:
                try:
                    addr = AddressModel.objects.filter(user_id=obj.id).first()
                except Exception:
                    addr = None

            if not addr:
                return {}

            # build dict of common fields
            out = {}
            for field in ('address_line', 'address1', 'address', 'street', 'line1', 'house', 'flat'):
                if hasattr(addr, field):
                    val = getattr(addr, field)
                    if val:
                        out['address_line'] = val
                        break
            for name in ('city', 'district', 'state', 'country', 'pincode', 'zip', 'postal_code'):
                if hasattr(addr, name):
                    val = getattr(addr, name)
                    if val:
                        out[name] = val
            # fallback: include simple scalar fields
            if not out:
                for f in addr._meta.fields:
                    fname = f.name
                    if fname in ('id', 'user_id', 'owner_id'):
                        continue
                    try:
                        val = getattr(addr, fname)
                        if val is None:
                            continue
                        if hasattr(val, '__class__') and not isinstance(val, (str, int, float, bool)):
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
        # ensure address is present as an object (never omit the key)
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

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            phone=validated_data.get("phone", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            password=validated_data["password"],
        )
        return user
