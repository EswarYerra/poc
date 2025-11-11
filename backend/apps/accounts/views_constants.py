# backend/apps/accounts/views_constants.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .constants import DEFAULT_MESSAGES


class ConstantsAPIView(APIView):
    """
    Returns all constant messages from constants.py (errors, validations, info).
    Public endpoint — no auth required.
    """

    permission_classes = [permissions.AllowAny]  # ✅ make public

    def get(self, request):
        return Response(DEFAULT_MESSAGES, status=status.HTTP_200_OK)
