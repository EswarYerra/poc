# backend/apps/accounts/views_password_reset.py

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
from django.contrib.auth import get_user_model
User = get_user_model()

logger = logging.getLogger(__name__)


def generate_otp():
    """Generate 6-digit numeric OTP"""
    return f"{random.randint(0, 999999):06d}"


# ==========================================================
# ✅ SEND OTP VIEW
# ==========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    """
    POST  { "email": "user@example.com" }
    Uses:
      EF001 → Email not registered
      IFP001 → Verification code sent successfully
      EA010 → Unexpected error
    """

    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 🔹 Normalize email (trim + lowercase)
    email = serializer.validated_data["email"].strip().lower()
    logger.info(f"📩 Normalized email received for OTP: {email}")

    # 🔹 Safe lookup: trim + lowercase at DB level (avoids spacing/case issues)
    users_qs = User.objects.extra(where=["TRIM(LOWER(email)) = %s"], params=[email])
    logger.info(f"🔍 User found? {users_qs.exists()}")

    if not users_qs.exists():
        msg = get_message("EF001")  # Email not registered
        return Response(msg, status=status.HTTP_404_NOT_FOUND)

    # ✅ Generate OTP & expiry
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
            send_mail(
                subject,
                message,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
                [email],
            )
    except Exception as exc:
        logger.exception("Failed to send OTP email: %s", exc)
        msg = get_message("EA010")  # Unexpected error
        return Response(msg, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ✅ Success
    msg = get_message("IFP001")  # Verification code sent successfully
    return Response(msg, status=status.HTTP_200_OK)


# ==========================================================
# ✅ VERIFY OTP VIEW
# ==========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Expects:
      {
        "email": "user@example.com",
        "otp": "123456",
        "new_password": "...",
        "confirm_password": "..."
      }
    Uses:
      EF001 → Email not registered
      EF003 → Password mismatch
      EF004 → Session expired
      EF005 → Invalid verification code
      EF006 → Failed to update password
      IFP002 → Password reset successful
    """

    from django.contrib.auth import get_user_model
    User = get_user_model()

    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        msg = get_message("VA004")  # Invalid input
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data["email"].strip().lower()
    otp = serializer.validated_data["otp"]
    new_password = serializer.validated_data["new_password"]
    confirm_password = serializer.validated_data["confirm_password"]

    # ✅ Password mismatch
    if new_password != confirm_password:
        msg = get_message("EF003")
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Normalize OTP entry lookup
    otp_entry = OTPCode.objects.filter(email__iexact=email).order_by("-expiry_time").first()
    if not otp_entry:
        msg = get_message("EF005")  # Invalid verification code
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Expired OTP
    if otp_entry.expiry_time < timezone.now():
        msg = get_message("EF004")
        OTPCode.objects.filter(email__iexact=email).delete()
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Incorrect OTP
    if otp_entry.otp_code.strip() != otp.strip():
        msg = get_message("EF005")
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Fetch user safely
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        # 🔍 Debug: list all users if mismatch happens again
        print("⚠️ User lookup failed for:", email)
        print("📜 Available users:", list(User.objects.values_list("email", flat=True)))
        msg = get_message("EF001")  # Email not registered
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Reset password securely
    try:
        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            OTPCode.objects.filter(email__iexact=email).delete()
    except Exception as exc:
        logger.exception("Failed to reset password for %s: %s", email, exc)
        msg = get_message("EF006")
        return Response(msg, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ✅ Success
    msg = get_message("IFP002")
    return Response(msg, status=status.HTTP_200_OK)
