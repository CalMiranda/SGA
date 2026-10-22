from django.contrib import admin
from django.urls import include, path
from rest_framework.permissions import AllowAny

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from .auth_views import (
    CsrfTokenView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RefreshView,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    # Autenticación de sesión mediante JWT en cookies HttpOnly.
    path("api/auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", CurrentUserView.as_view(), name="auth-me"),

    # Funciones administrativas y de autoservicio.
    path("api/", include("gestion.urls")),

    # API del Sistema de Gestión de Asistencia
    path("api/", include("personas.urls")),
    path("api/", include("horarios.urls")),
    path("api/", include("asistencias.urls")),
    path("api/", include("incidencias.urls")),

    # Esquema OpenAPI
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[AllowAny]),
        name="schema",
    ),

    # Documentación Swagger
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema",
            permission_classes=[AllowAny],
        ),
        name="swagger-ui",
    ),
]
