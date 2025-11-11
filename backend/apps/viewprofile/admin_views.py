from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.viewprofile.models import UserProfile
from apps.viewprofile.serializers import UserProfileSerializer


# ----------------------------
# ✅ Admin User Management
# ----------------------------
class AdminUserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


# ----------------------------
# ✅ Admin Address (UserProfile) Management
# ----------------------------
class AdminAddressListCreateView(generics.ListCreateAPIView):
    """
    Allows admin to view all user profiles (addresses)
    or filter by user ID.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = UserProfile.objects.all().order_by('-id')
        user_id = self.request.query_params.get("user")
        if user_id:
            # ✅ Filter by user foreign key, not profile ID
            queryset = queryset.filter(user__id=user_id)
        return queryset

    def perform_create(self, serializer):
        # ✅ Assign profile to correct user
        user_id = self.request.data.get("user")
        if user_id:
            serializer.save(user_id=user_id)
        else:
            serializer.save()


class AdminAddressRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    Allows admin to fetch or update a specific user's profile (address).
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = UserProfile.objects.all()
        user_id = self.request.query_params.get("user")
        if user_id:
            # ✅ Filter profile by user ID
            queryset = queryset.filter(user__id=user_id)
        return queryset


# ----------------------------
# ✅ Check if a user profile exists
# ----------------------------
@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_check_address(request):
    """Check whether a specific user has a profile record."""
    user_id = request.query_params.get("user")
    if not user_id:
        return Response({"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Check profile by user foreign key
    has_profile = UserProfile.objects.filter(user__id=user_id).exists()
    return Response({"has_profile": has_profile})
