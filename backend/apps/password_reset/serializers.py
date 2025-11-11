from rest_framework import serializers

class SendOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6, min_length=6)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        # Basic validation to ensure only digits in OTP
        otp = data.get("otp", "")
        if not otp.isdigit():
            raise serializers.ValidationError({"otp": "OTP must be numeric."})
        return data
