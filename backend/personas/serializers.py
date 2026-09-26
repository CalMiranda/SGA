from rest_framework import serializers

from .models import Persona


class PersonaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Persona

        fields = [
            "id",
            "codigo",
            "nombres",
            "apellidos",
            "activo",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

        read_only_fields = [
            "id",
            "fecha_creacion",
            "fecha_actualizacion",
        ]