from rest_framework import serializers

from .models import RegistroAsistencia


class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    persona_codigo = serializers.CharField(
        source="persona.codigo",
        read_only=True,
    )

    persona_nombre = serializers.SerializerMethodField()

    persona_rol = serializers.CharField(
        source="persona.get_rol_display",
        read_only=True,
    )

    persona_area = serializers.CharField(
        source="persona.area",
        read_only=True,
    )

    horario_nombre = serializers.CharField(
        source="horario.nombre",
        read_only=True,
    )

    estado_display = serializers.CharField(
        source="get_estado_display",
        read_only=True,
    )

    class Meta:
        model = RegistroAsistencia

        fields = [
            "id",
            "persona",
            "persona_codigo",
            "persona_nombre",
            "persona_rol",
            "persona_area",
            "horario",
            "horario_nombre",
            "fecha",
            "hora_registro",
            "estado",
            "estado_display",
            "observacion",
            "fecha_creacion",
        ]

        read_only_fields = [
            "id",
            "fecha_creacion",
        ]

    validators = []

    def get_persona_nombre(self, obj) -> str:
        return f"{obj.persona.nombres} {obj.persona.apellidos}".strip()

    def validate_persona(self, persona):
        if not persona.activo:
            raise serializers.ValidationError(
                "No se puede registrar asistencia para una persona inactiva."
            )

        return persona

    def validate(self, data):
        persona = data.get(
            "persona",
            getattr(self.instance, "persona", None),
        )

        horario = data.get(
            "horario",
            getattr(self.instance, "horario", None),
        )

        fecha = data.get(
            "fecha",
            getattr(self.instance, "fecha", None),
        )

        if persona and horario and fecha:
            registros = RegistroAsistencia.objects.filter(
                persona=persona,
                horario=horario,
                fecha=fecha,
            )

            if self.instance:
                registros = registros.exclude(
                    pk=self.instance.pk
                )

            if registros.exists():
                raise serializers.ValidationError(
                    "Ya existe un registro de asistencia para esta persona, horario y fecha."
                )

        return data
