from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RegistroAsistenciaViewSet


router = DefaultRouter()

router.register(
    r"asistencias",
    RegistroAsistenciaViewSet,
    basename="asistencia",
)


urlpatterns = [
    path("", include(router.urls)),
]