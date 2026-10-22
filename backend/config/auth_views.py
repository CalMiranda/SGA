from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import EMPLOYEE_ROLE, READ_ONLY_ROLES, WRITE_ROLES
from gestion.audit import record_event


class PublicUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    roles = serializers.ListField(child=serializers.CharField())


class AuthResponseSerializer(serializers.Serializer):
    user = PublicUserSerializer()


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class CsrfTokenResponseSerializer(serializers.Serializer):
    csrfToken = serializers.CharField()


class AuthErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()


class LoginRateThrottle(AnonRateThrottle):
    rate = "5/minute"


def public_user(user):
    roles = list(user.groups.values_list("name", flat=True))
    if user.is_superuser:
        roles.append("Administrador")
    return {
        "id": user.pk,
        "username": user.get_username(),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "roles": roles,
    }


def has_sga_role(user):
    return user.is_superuser or user.groups.filter(
        name__in=WRITE_ROLES | READ_ONLY_ROLES | {EMPLOYEE_ROLE}
    ).exists()


def set_auth_cookies(response, access_token, refresh_token):
    secure = not settings.DEBUG
    same_site = settings.AUTH_COOKIE_SAMESITE
    access_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        settings.AUTH_ACCESS_COOKIE,
        access_token,
        max_age=access_age,
        httponly=True,
        secure=secure,
        samesite=same_site,
        path="/",
    )
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE,
        refresh_token,
        max_age=refresh_age,
        httponly=True,
        secure=secure,
        samesite=same_site,
        path="/api/auth/",
    )
    return response


def clear_auth_cookies(response):
    response.delete_cookie(
        settings.AUTH_ACCESS_COOKIE,
        path="/",
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.AUTH_REFRESH_COOKIE,
        path="/api/auth/",
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    return response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=CsrfTokenResponseSerializer)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        request=LoginRequestSerializer,
        responses={
            200: AuthResponseSerializer,
            401: AuthErrorSerializer,
            403: AuthErrorSerializer,
        },
    )
    def post(self, request):
        identifier = request.data.get("username", "")
        password = request.data.get("password", "")
        if not isinstance(identifier, str) or not isinstance(password, str):
            return Response(
                {"detail": "No se pudo iniciar sesión. Verifica tus credenciales."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        identifier = identifier.strip()
        user_model = get_user_model()
        username_field = user_model.USERNAME_FIELD
        account_lookup = Q(**{f"{username_field}__iexact": identifier})
        if username_field != "email":
            account_lookup |= Q(email__iexact=identifier)

        candidates = list(user_model.objects.filter(account_lookup).distinct()[:2])
        user = None
        if identifier and password and len(candidates) == 1:
            user = authenticate(
                request=request,
                **{
                    username_field: getattr(candidates[0], username_field),
                    "password": password,
                },
            )

        if user is None:
            return Response(
                {"detail": "No se pudo iniciar sesión. Verifica tus credenciales."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not has_sga_role(user):
            return Response(
                {"detail": "La cuenta no tiene un rol habilitado para el SGA."},
                status=status.HTTP_403_FORBIDDEN,
            )

        record_event(user, "auth.User", user.pk, "LOGIN")

        refresh_token = RefreshToken.for_user(user)

        response = Response(
            {"user": public_user(user)},
            status=status.HTTP_200_OK,
        )
        return set_auth_cookies(
            response,
            str(refresh_token.access_token),
            str(refresh_token),
        )


@method_decorator(csrf_protect, name="dispatch")
class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses={
            204: OpenApiResponse(description="Sesión renovada mediante cookies HttpOnly."),
            401: AuthErrorSerializer,
        },
    )
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        if not refresh_token:
            return Response(
                {"detail": "La sesión venció. Inicia sesión nuevamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        if not serializer.is_valid():
            response = Response(
                {"detail": "La sesión venció. Inicia sesión nuevamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response)

        tokens = serializer.validated_data
        rotated_refresh = tokens.get("refresh", refresh_token)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        return set_auth_cookies(response, tokens["access"], rotated_refresh)


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses={204: OpenApiResponse(description="Sesión cerrada y cookies revocadas.")},
    )
    def post(self, request):
        refresh_token = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE)
        user = None
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                user = get_user_model().objects.filter(
                    pk=token.get(api_settings.USER_ID_CLAIM), is_active=True
                ).first()
                if user:
                    record_event(user, "auth.User", user.pk, "LOGOUT")
                token.blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_auth_cookies(response)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=AuthResponseSerializer)
    def get(self, request):
        return Response({"user": public_user(request.user)})
