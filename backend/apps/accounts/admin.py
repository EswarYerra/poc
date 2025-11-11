# backend/apps/accounts/admin.py
from django.contrib import admin
from .models import UserInformation, UserError, UserValidation

@admin.register(UserInformation)
class UserInformationAdmin(admin.ModelAdmin):
    list_display = ('information_code', 'information_text')
    search_fields = ('information_code', 'information_text')


@admin.register(UserValidation)
class UserValidationAdmin(admin.ModelAdmin):
    list_display = ('validation_code', 'validation_message')
    search_fields = ('validation_code', 'validation_message')


@admin.register(UserError)
class UserErrorAdmin(admin.ModelAdmin):
    list_display = ('error_code', 'error_message')
    search_fields = ('error_code', 'error_message')
