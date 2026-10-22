from rest_framework import viewsets

from gestion.audit import AuditModelViewSetMixin
from .models import Persona
from .serializers import PersonaSerializer


class PersonaViewSet(AuditModelViewSetMixin, viewsets.ModelViewSet):
    """
    Servicio REST para administrar las personas registradas en el SGA.
    """

    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer
