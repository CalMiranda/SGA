from rest_framework import viewsets

from gestion.audit import AuditModelViewSetMixin
from .models import Incidencia, Justificacion
from .serializers import (
    IncidenciaSerializer,
    JustificacionSerializer,
)


class IncidenciaViewSet(AuditModelViewSetMixin, viewsets.ModelViewSet):
    """
    Servicio REST para administrar las incidencias
    asociadas a registros de asistencia del SGA.
    """

    queryset = Incidencia.objects.select_related(
        "asistencia",
        "asistencia__persona",
        "asistencia__horario",
    ).all()

    serializer_class = IncidenciaSerializer


class JustificacionViewSet(AuditModelViewSetMixin, viewsets.ModelViewSet):
    """
    Servicio REST para registrar y revisar
    justificaciones asociadas a incidencias.
    """

    queryset = Justificacion.objects.select_related(
        "incidencia",
        "incidencia__asistencia",
        "incidencia__asistencia__persona",
        "incidencia__asistencia__horario",
    ).all()

    serializer_class = JustificacionSerializer
