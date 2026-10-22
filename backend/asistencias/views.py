from rest_framework import viewsets

from gestion.audit import AuditModelViewSetMixin
from .models import RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer


class RegistroAsistenciaViewSet(AuditModelViewSetMixin, viewsets.ModelViewSet):
    """
    Servicio REST para registrar y administrar
    la asistencia de las personas en el SGA.
    """

    queryset = RegistroAsistencia.objects.select_related(
        "persona",
        "horario",
    ).all()

    serializer_class = RegistroAsistenciaSerializer
