from rest_framework import serializers
from django.contrib.auth import password_validation
from apps.accounts.models import UserError, UserInformation, UserValidation  # ✅ correct path
from apps.accounts.constants import DEFAULT_MESSAGES as DEFAULTS

def get_message_by_code(model, code, default=""):
    """
    Utility function to fetch message by code from DB; falls back to constants if missing.
    """
    try:
        code = code.upper().strip()
        if model == UserError:
            record = model.objects.filter(error_code__iexact=code).first()
            msg = record.error_message if record else ""
        elif model == UserInformation:
            record = model.objects.filter(information_code__iexact=code).first()
            msg = record.information_text if record else ""
        elif model == UserValidation:
            record = model.objects.filter(validation_code__iexact=code).first()
            msg = record.validation_message if record else ""
        else:
            msg = ""

        if msg:
            print(f"✅ get_message_by_code → {code} from DB: {msg}")
            return msg

        # ✅ fallback from constants.py
        from apps.accounts.constants import DEFAULT_MESSAGES
        defaults = DEFAULT_MESSAGES.get("INFORMATION", {})
        fallback_msg = defaults.get(code, default)
        print(f"⚠️ get_message_by_code → {code} using fallback: {fallback_msg}")
        return fallback_msg or default

    except Exception as e:
        print(f"❌ get_message_by_code failed for {code}: {e}")
        return default


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        user = self.context["request"].user

        # Check old password
        if not user.check_password(attrs["old_password"]):
            msg = get_message_by_code(UserError, "EC001", "Wrong old password.")
            raise serializers.ValidationError({"old_password": msg})

        # Confirm new passwords match
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        # Validate password complexity
        password_validation.validate_password(attrs["new_password"], user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()

        # Fetch success message (from DB or fallback)
        info_msg = get_message_by_code(
            UserInformation,
            "ICP001",
            "Password changed successfully"
        )
        print(f"✅ Returning info message for ICP001: {info_msg}")
        return {"detail": info_msg}
