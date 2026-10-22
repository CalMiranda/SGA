from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditEventsView,
    ConfigurationPeopleView,
    ManagedAccountViewSet,
    MyAttendanceHistoryView,
    RolesView,
)


router = DefaultRouter()
router.register("configuracion/usuarios", ManagedAccountViewSet, basename="configuracion-usuario")

urlpatterns = [
    path("auditoria/", AuditEventsView.as_view(), name="auditoria"),
    path("configuracion/roles/", RolesView.as_view(), name="configuracion-roles"),
    path("configuracion/personas/", ConfigurationPeopleView.as_view(), name="configuracion-personas"),
    path("mi-historial/", MyAttendanceHistoryView.as_view(), name="mi-historial"),
    path("", include(router.urls)),
]
