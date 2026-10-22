from django.utils import timezone
from rest_framework import serializers

from .models import Incidencia, Justificacion


class IncidenciaSerializer(serializers.ModelSerializer):
    persona_codigo = serializers.CharField(
        source="asistencia.persona.codigo",
        read_only=True,
    )

    persona_nombre = serializers.SerializerMethodField()

    fecha_asistencia = serializers.DateField(
        source="asistencia.fecha",
        read_only=True,
    )

    horario_nombre = serializers.CharField(
        source="asistencia.horario.nombre",
        read_only=True,
    )

    estado_asistencia = serializers.CharField(
        source="asistencia.get_estado_display",
        read_only=True,
    )

    tipo_display = serializers.CharField(
        source="get_tipo_display",
        read_only=True,
    )

    estado_display = serializers.CharField(
        source="get_estado_display",
        read_only=True,
    )

    tiene_justificacion = serializers.SerializerMethodField()

    class Meta:
        model = Incidencia

        fields = [
            "id",
            "asistencia",
            "persona_codigo",
            "persona_nombre",
            "fecha_asistencia",
            "horario_nombre",
            "estado_asistencia",
            "tipo",
            "tipo_display",
            "descripcion",
            "estado",
            "estado_display",
            "tiene_justificacion",
            "fecha_creacion",
        ]

        read_only_fields = [
            "id",
            "fecha_creacion",
        ]

    def get_persona_nombre(self, obj) -> str:
        persona = obj.asistencia.persona

        return (
            f"{persona.nombres} "
            f"{persona.apellidos}"
        ).strip()

    def get_tiene_justificacion(self, obj) -> bool:
        return hasattr(obj, "justificacion")


class JustificacionSerializer(serializers.ModelSerializer):
    persona_codigo = serializers.CharField(
        source="incidencia.asistencia.persona.codigo",
        read_only=True,
    )

    persona_nombre = serializers.SerializerMethodField()

    fecha_asistencia = serializers.DateField(
        source="incidencia.asistencia.fecha",
        read_only=True,
    )

    tipo_incidencia = serializers.CharField(
        source="incidencia.get_tipo_display",
        read_only=True,
    )

    descripcion_incidencia = serializers.CharField(
        source="incidencia.descripcion",
        read_only=True,
    )

    estado_display = serializers.CharField(
        source="get_estado_display",
        read_only=True,
    )

    class Meta:
        model = Justificacion

        fields = [
            "id",
            "incidencia",
            "persona_codigo",
            "persona_nombre",
            "fecha_asistencia",
            "tipo_incidencia",
            "descripcion_incidencia",
            "motivo",
            "estado",
            "estado_display",
            "observacion_revision",
            "fecha_solicitud",
            "fecha_revision",
        ]

        read_only_fields = [
            "id",
            "fecha_solicitud",
            "fecha_revision",
        ]

        validators = []

    def get_persona_nombre(self, obj) -> str:
        persona = obj.incidencia.asistencia.persona

        return (
            f"{persona.nombres} "
            f"{persona.apellidos}"
        ).strip()

    def validate_incidencia(self, incidencia):
        justificaciones = Justificacion.objects.filter(
            incidencia=incidencia
        )

        if self.instance:
            justificaciones = justificaciones.exclude(
                pk=self.instance.pk
            )

        if justificaciones.exists():
            raise serializers.ValidationError(
                "Esta incidencia ya posee una justificación."
            )

        return incidencia

    def create(self, validated_data):
        justificacion = super().create(validated_data)

        incidencia = justificacion.incidencia

        incidencia.estado = Incidencia.ESTADO_REVISADA
        incidencia.save(update_fields=["estado"])

        return justificacion

    def update(self, instance, validated_data):
        instance = super().update(
            instance,
            validated_data,
        )

        incidencia = instance.incidencia

        if instance.estado in [
            Justificacion.ESTADO_APROBADA,
            Justificacion.ESTADO_RECHAZADA,
        ]:
            instance.fecha_revision = timezone.now()

            instance.save(
                update_fields=["fecha_revision"]
            )

            incidencia.estado = (
                Incidencia.ESTADO_RESUELTA
            )

            incidencia.save(
                update_fields=["estado"]
            )

            if (
                instance.estado
                == Justificacion.ESTADO_APROBADA
            ):
                asistencia = incidencia.asistencia

                asistencia.estado = "justificada"

                asistencia.save(
                    update_fields=["estado"]
                )

        return instance
