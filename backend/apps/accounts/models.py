# backend/apps/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
#from apps.accounts.models import UserError, UserInformation

class User(AbstractUser):
    email = models.EmailField(unique=True)  # ✅ Make email unique
    phone = models.CharField(max_length=15, unique=False, null=True, blank=True)

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')

    def save(self, *args, **kwargs):
        # ✅ Always store lowercase trimmed emails
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class UserError(models.Model):
    # Matches your existing user_error table: error_code, error_message
    error_code = models.CharField(max_length=20, unique=True)
    error_message = models.CharField(max_length=255)

    class Meta:
        db_table = "user_error"

    def __str__(self):
        return f"{self.error_code} - {self.error_message}"


class UserInformation(models.Model):
    # Matches your existing user_information table: information_code, information_text
    information_code = models.CharField(max_length=20, unique=True)
    information_text = models.TextField()

    class Meta:
        db_table = "user_information"

    def __str__(self):
        return self.information_code


class UserValidation(models.Model):
    # Matches your existing user_validation table: validation_code, validation_message
    validation_code = models.CharField(max_length=20, unique=True)
    validation_message = models.TextField()

    class Meta:
        db_table = "user_validation"

    def __str__(self):
        return self.validation_code
