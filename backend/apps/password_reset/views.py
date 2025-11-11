from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import random
from datetime import timedelta
import logging

from .models import OTPCode
from .serializers import SendOtpSerializer, VerifyOtpSerializer
from apps.accounts.models import User
from apps.utils.message_handler import get_message

logger = logging.getLogger(__name__)


def generate_otp():
    """Generate 6-digit numeric OTP"""
    return f"{random.randint(0, 999999):06d}"


@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    """
    Expects: { "email": "user@example.com" }
    Uses EF001 (email not registered), IFP001 (verification sent)
    """
    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"].strip().lower()

    # Check if user exists
    users_qs = User.objects.filter(email__iexact=email)
    if not users_qs.exists():
        msg = get_message("EF001")
        detail = msg.get("message") if isinstance(msg, dict) else "Email not registered."
        return Response({"detail": detail}, status=status.HTTP_404_NOT_FOUND)

    user = users_qs.first()

    # Generate OTP & expiry (default 5 min)
    otp = generate_otp()
    expiry = timezone.now() + timedelta(minutes=getattr(settings, "OTP_EXPIRY_MINUTES", 5))

    try:
        with transaction.atomic():
            OTPCode.objects.update_or_create(
                email=email,
                defaults={"otp_code": otp, "expiry_time": expiry},
            )

            subject = "Your Verification Code"
            message = f"Your verification code is: {otp}\nThis code expires in 5 minutes."
            send_mail(subject, message, getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"), [email])
    except Exception as exc:
        logger.exception("Failed to send OTP email: %s", exc)
        return Response({"detail": "Failed to send verification email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    msg = get_message("IFP001")
    detail = msg.get("message") if isinstance(msg, dict) else "Verification code sent successfully!"
    return Response({"detail": detail, "sent": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Expects: { "email": "user@example.com", "otp": "123456", "new_password": "...", "confirm_password": "..." }
    Uses:
      EF003 → Password mismatch
      EF004 → Session expired (OTP expired)
      EF005 → Invalid verification code
      IFP002 → Password reset successful
    """
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"].strip().lower()
    otp = serializer.validated_data["otp"]
    new_password = serializer.validated_data["new_password"]
    confirm_password = serializer.validated_data["confirm_password"]

    # Passwords mismatch
    if new_password != confirm_password:
        msg = get_message("EF003")
        detail = msg.get("message") if isinstance(msg, dict) else "Password mismatch."
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    otp_entry = OTPCode.objects.filter(email__iexact=email).order_by("-expiry_time").first()
    if not otp_entry:
        msg = get_message("EF005")
        detail = msg.get("message") if isinstance(msg, dict) else "Invalid verification code."
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    # Expired OTP
    if otp_entry.expiry_time < timezone.now():
        msg = get_message("EF004")
        detail = msg.get("message") if isinstance(msg, dict) else "Session ended. Please request a new verification code."
        OTPCode.objects.filter(email=email).delete()
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    # Wrong OTP
    if otp_entry.otp_code != otp:
        msg = get_message("EF005")
        detail = msg.get("message") if isinstance(msg, dict) else "Invalid verification code."
        return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

    # Update password
    try:
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Email not registered.", "code": "EF001"}, status=400)
        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            OTPCode.objects.filter(email__iexact=email).delete()
    except Exception as exc:
        logger.exception("Failed to reset password for %s: %s", email, exc)
        return Response({"detail": "Failed to update password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    msg = get_message("IFP002")
    detail = msg.get("message") if isinstance(msg, dict) else "Password reset successfully!"
    return Response({"detail": detail}, status=status.HTTP_200_OK)
