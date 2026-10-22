from rest_framework import viewsets

from gestion.audit import AuditModelViewSetMixin
from .models import Horario
from .serializers import HorarioSerializer


class HorarioViewSet(AuditModelViewSetMixin, viewsets.ModelViewSet):
    """
    Servicio REST para administrar los horarios registrados en el SGA.
    """

    queryset = Horario.objects.all()
    serializer_class = HorarioSerializer
