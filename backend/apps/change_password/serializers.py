from rest_framework import serializers
from django.contrib.auth import password_validation
from apps.accounts.models import UserError, UserInformation  # ✅ correct path


def get_message_by_code(model, code, default=""):
    """
    Utility function to fetch message by code from the database tables.
    """
    try:
        if model == UserError:
            record = model.objects.filter(error_code=code).first()
            return record.error_message if record else default
        else:
            record = model.objects.filter(information_code=code).first()
            return record.information_text if record else default
    except Exception:
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

        # Fetch success info message from UserInformation table (ICP001)
        info_msg = get_message_by_code(
            UserInformation, "ICP001", "Password changed successfully."
        )
        return {"detail": info_msg}
