from rest_framework import serializers

from .models import Horario


class HorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Horario
        fields = [
            "id",
            "nombre",
            "hora_entrada",
            "hora_salida",
            "tolerancia_minutos",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        hora_entrada = data.get(
            "hora_entrada",
            getattr(self.instance, "hora_entrada", None),
        )

        hora_salida = data.get(
            "hora_salida",
            getattr(self.instance, "hora_salida", None),
        )

        if (
            hora_entrada is not None
            and hora_salida is not None
            and hora_salida <= hora_entrada
        ):
            raise serializers.ValidationError(
                {
                    "hora_salida":
                        "La hora de salida debe ser posterior a la hora de entrada."
                }
            )

        return data