from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Read short-lived access JWTs from HttpOnly cookies and enforce CSRF."""

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.AUTH_ACCESS_COOKIE)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            self.enforce_csrf(request)

        return user, validated_token

    @staticmethod
    def enforce_csrf(request):
        django_request = getattr(request, "_request", request)
        check = CSRFCheck(lambda _request: None)
        check.process_request(django_request)
        reason = check.process_view(django_request, None, (), {})
        if reason:
            raise PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "config.authentication.CookieJWTAuthentication"
    name = "cookieJWTAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.AUTH_ACCESS_COOKIE,
            "description": "JWT HttpOnly. Las solicitudes que escriben datos también requieren X-CSRFToken.",
        }
