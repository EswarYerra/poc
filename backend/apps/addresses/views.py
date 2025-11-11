from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Address
from .serializers import AddressSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import status


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # ✅ Admin viewing another user's address: /api/addresses/?user=id
        user_id = self.request.query_params.get("user")
        if user.is_staff and user_id:
            return Address.objects.filter(user__id=user_id)

        # ✅ Normal users see only their address
        return Address.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        user_id = self.request.data.get("user")

        # ✅ Admin creating address for another user
        if user.is_staff and user_id:
            serializer.save(user_id=user_id)
        else:
            serializer.save(user=user)


class AddressRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # ✅ Admin can view/update anyone's address
        if user.is_staff:
            return Address.objects.all()

        # ✅ Normal users only theirs
        return Address.objects.filter(user=user)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def check_address(request):
    """
    Returns:
    { "has_address": true/false }
    Used after login to detect if user goes to /profile or /addresses
    """
    has_address = Address.objects.filter(user=request.user).exists()
    return Response({"has_address": has_address})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_address(request):
    """
    Returns the current user's saved address.
    URL: /api/addresses/me/
    """
    try:
        address = Address.objects.filter(user=request.user).first()
        if not address:
            return Response({}, status=status.HTTP_200_OK)
        serializer = AddressSerializer(address)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        print("Error fetching user address:", e)
        return Response({"detail": "Failed to load address."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
