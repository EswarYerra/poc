from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import ChangePasswordSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/change-password/
    {
      "old_password": "...",
      "new_password": "...",
      "confirm_password": "..."
    }
    """
    serializer = ChangePasswordSerializer(data=request.data, context={"request": request})

    if serializer.is_valid():
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
