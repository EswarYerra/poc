from django.db import models

class OTPCode(models.Model):
    """
    Stores OTP codes temporarily for password reset
    """
    email = models.EmailField(max_length=255)
    otp_code = models.CharField(max_length=6)
    expiry_time = models.DateTimeField()

    def __str__(self):
        return f"{self.email} - {self.otp_code}"
