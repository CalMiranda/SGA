from rest_framework import viewsets

from .models import Persona
from .serializers import PersonaSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    """
    Servicio REST para administrar las personas registradas en el SGA.
    """

    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer