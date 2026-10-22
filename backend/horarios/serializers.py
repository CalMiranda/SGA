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
            "tipo",
            "dias_aplicables",
            "area",
            "activo",
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

        days = data.get(
            "dias_aplicables",
            getattr(self.instance, "dias_aplicables", None),
        )
        valid_days = {"lun", "mar", "mie", "jue", "vie", "sab", "dom"}
        if not isinstance(days, list) or not days or any(day not in valid_days for day in days):
            raise serializers.ValidationError(
                {"dias_aplicables": "Selecciona al menos un día aplicable válido."}
            )

        return data
