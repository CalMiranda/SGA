from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    IncidenciaViewSet,
    JustificacionViewSet,
)


router = DefaultRouter()

router.register(
    r"incidencias",
    IncidenciaViewSet,
    basename="incidencia",
)

router.register(
    r"justificaciones",
    JustificacionViewSet,
    basename="justificacion",
)


urlpatterns = [
    path("", include(router.urls)),
]