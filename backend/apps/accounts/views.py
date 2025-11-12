# backend/apps/accounts/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status, permissions, generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.apps import apps as django_apps
import logging

from .models import User, UserError, UserInformation, UserValidation
from .serializers import RegisterSerializer, UserSerializer
from apps.utils.message_handler import get_message
from .constants import DEFAULT_MESSAGES

logger = logging.getLogger(__name__)

# ✅ Unified endpoint to return message tables
@api_view(['GET'])
@permission_classes([AllowAny])
def get_message_tables(request):
    """
    Fetch all user_error, user_validation, and user_information records
    and return them as JSON for frontend caching.
    Returns dictionaries keyed by code for fast lookup on the frontend.
    """
    try:
        errors = list(UserError.objects.values('error_code', 'error_message'))
        validations = list(UserValidation.objects.values('validation_code', 'validation_message'))
        informations = list(UserInformation.objects.values('information_code', 'information_text'))

        data = {
            "user_error": list(UserError.objects.values("error_code", "error_message")),
            "user_validation": list(UserValidation.objects.values("validation_code", "validation_message")),
            "user_information": list(UserInformation.objects.values("information_code", "information_text")),
        }

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Failed to fetch message tables")
        return Response(
            {"error": f"Failed to fetch message tables: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ✅ User Registration
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    email = request.data.get('email')
    phone = request.data.get('phone')
    password = request.data.get('password')

    # Required field validation
    if not username or not email or not phone or not password:
        msg = get_message("EV001")
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # Duplicate username check
    if User.objects.filter(username__iexact=username).exists():
        msg = get_message("EV002")
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    # Duplicate email check (return ES003 if already registered)
    if User.objects.filter(email__iexact=email).exists():
        msg = get_message("ES003")
        return Response(msg, status=status.HTTP_400_BAD_REQUEST)

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        msg = get_message("IR001")
        return Response(msg, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ Profile View / Update
class ProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_user_address(self, user):
        """
        Try to fetch an Address object related to the user from apps.addresses.Address.
        Return a simple dict (possibly empty) representing the address.
        This function is defensive: if addresses app or model does not exist, it returns {}.
        """
        try:
            # Try to get model (app label 'addresses', model name 'Address')
            AddressModel = django_apps.get_model('addresses', 'Address')
        except LookupError:
            # Addresses app/model not present — return empty dict
            return {}

        if AddressModel is None:
            return {}

        try:
            # Try to find a related address by a common key. We check a few patterns:
            # 1) Address has a 'user' FK field
            # 2) Address has a 'owner' FK field
            # 3) Address has 'user_id' or similar: fallback to filter by user id field
            q = None
            if hasattr(AddressModel, 'objects'):
                # prefer direct relation user -> Address
                if 'user' in [f.name for f in AddressModel._meta.fields]:
                    q = AddressModel.objects.filter(user=user).first()
                elif 'owner' in [f.name for f in AddressModel._meta.fields]:
                    q = AddressModel.objects.filter(owner=user).first()
                else:
                    # generic attempt: try filter(user_id=user.id)
                    try:
                        q = AddressModel.objects.filter(user_id=user.id).first()
                    except Exception:
                        q = None
            addr_obj = q
            if not addr_obj:
                return {}

            # Build a small dict from the address object by selecting typical fields if present.
            out = {}
            for field in ('address_line', 'address1', 'address', 'street', 'line1', 'house', 'flat'):
                if hasattr(addr_obj, field):
                    val = getattr(addr_obj, field)
                    if val:
                        out['address_line'] = val
                        break
            # additional typical fields
            for name in ('city', 'district', 'state', 'country', 'pincode', 'zip', 'postal_code'):
                if hasattr(addr_obj, name):
                    val = getattr(addr_obj, name)
                    if val:
                        out[name] = val
            # If we didn't gather fields via names, try serializing all simple attrs (non-relations)
            if not out:
                # take small set of non-relational fields
                for f in addr_obj._meta.fields:
                    fname = f.name
                    if fname in ('id', 'user_id', 'owner_id'):
                        continue
                    try:
                        val = getattr(addr_obj, fname)
                        # filter out related/None
                        if val is None:
                            continue
                        # avoid full objects
                        if hasattr(val, '__class__') and not isinstance(val, (str, int, float, bool)):
                            continue
                        out[fname] = val
                    except Exception:
                        continue

            return out
        except Exception:
            # if anything goes wrong we don't want profile endpoint to crash
            logger.exception("Error fetching address for user %s", user.id)
            return {}

    def get(self, request):
        # Base user serializer data
        serializer = UserSerializer(request.user)
        user_data = dict(serializer.data)

        # Attach address info (empty dict if none)
        address_dict = self._get_user_address(request.user)
        # normalize to {} if falsy
        user_data['address'] = address_dict if address_dict else {}

        return Response(user_data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # attach address again after update
            data = dict(serializer.data)
            data['address'] = self._get_user_address(request.user) or {}
            return Response(data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        return self.put(request)


# ✅ JWT Serializer & View
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data.update({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
            "is_admin": user.is_superuser or user.is_staff,
        })
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ✅ Admin APIs
class AdminUserListCreateAPIView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class AdminUserUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class AdminUserStatsAPIView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        hold_users = User.objects.filter(is_active=False).count()
        return Response({
            "total_users": total_users,
            "active_users": active_users,
            "hold_users": hold_users,
        })


# ✅ Login API
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({
            "status": "error",
            "code": "EL001",
            "message": "Username and password are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        msg = get_message("IL001")  # "Login successful" from DB

        return Response({
            "status": "success",
            "code": msg.get("code", "IL001"),
            "message": msg.get("message", "Login successful"),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_superuser or user.is_staff,
        }, status=status.HTTP_200_OK)
    else:
        msg = get_message("EL001")  # "Invalid credentials"
        return Response({
            "status": "error",
            "code": msg.get("code", "EL001"),
            "message": msg.get("message", "Username or password not correct"),
        }, status=status.HTTP_400_BAD_REQUEST)


# ✅ Username availability check
@api_view(['GET'])
@permission_classes([AllowAny])
def check_username(request):
    username = request.query_params.get("username", "").strip()
    if not username:
        return Response({"detail": "username query param required"}, status=status.HTTP_400_BAD_REQUEST)

    exists = User.objects.filter(username__iexact=username).exists()
    return Response({"exists": exists}, status=status.HTTP_200_OK)


# ✅ Email availability check
@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    """
    Check if an email already exists in DB
    GET /api/auth/check-email/?email=example@gmail.com
    """
    email = request.query_params.get("email", "").strip()
    if not email:
        return Response({"detail": "email query param required"}, status=status.HTTP_400_BAD_REQUEST)
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({"exists": exists}, status=status.HTTP_200_OK)

@api_view(["GET"])
def get_messages(request):
    try:
        user_error = list(UserError.objects.values("error_code", "error_message"))
        user_validation = list(UserValidation.objects.values("validation_code", "validation_message"))
        user_information = list(UserInformation.objects.values("information_code", "information_text"))
    except Exception:
        # In case DB is not reachable
        user_error, user_validation, user_information = [], [], []

    # Merge default constants if DB doesn’t contain them
    existing_error_codes = {e["error_code"] for e in user_error}
    for code, msg in DEFAULT_MESSAGES["ERRORS"].items():
        if code not in existing_error_codes:
            user_error.append({"error_code": code, "error_message": msg})

    existing_validation_codes = {v["validation_code"] for v in user_validation}
    for code, msg in DEFAULT_MESSAGES["VALIDATIONS"].items():
        if code not in existing_validation_codes:
            user_validation.append({"validation_code": code, "validation_message": msg})

    existing_info_codes = {i["information_code"] for i in user_information}
    for code, msg in DEFAULT_MESSAGES["INFORMATION"].items():
        if code not in existing_info_codes:
            user_information.append({"information_code": code, "information_text": msg})

    return Response({
        "user_error": user_error,
        "user_validation": user_validation,
        "user_information": user_information,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def message_detail(request, type, code):
    """
    Returns message for given type (error, validation, information) and code.
    Prefers DB message; falls back to constants.py if DB is missing.
    """
    try:
        type = type.lower().strip()
        code = code.strip().upper()
        message = None
        source = None

        if type == "error":
            message = (
                UserError.objects.filter(error_code__iexact=code)
                .values_list("error_message", flat=True)
                .first()
            )
        elif type == "validation":
            message = (
                UserValidation.objects.filter(validation_code__iexact=code)
                .values_list("validation_message", flat=True)
                .first()
            )
        elif type == "information":
            message = (
                UserInformation.objects.filter(information_code__iexact=code)
                .values_list("information_text", flat=True)
                .first()
            )

        if message:
            source = "DB"
        else:
            if type == "error":
                message = DEFAULT_MESSAGES["ERRORS"].get(code, "")
            elif type == "validation":
                message = DEFAULT_MESSAGES["VALIDATIONS"].get(code, "")
            elif type == "information":
                message = DEFAULT_MESSAGES["INFORMATION"].get(code, "")
            source = "CONSTANTS"

        print(f"📢 message_detail → TYPE={type.upper()} CODE={code} SOURCE={source} MESSAGE={message}")
        return Response({"code": code, "message": message, "source": source}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ message_detail error: {e}")
        return Response({"message": f"Server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)