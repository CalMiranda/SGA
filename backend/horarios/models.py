from django.db import models


def dias_habiles_por_defecto():
    return ["lun", "mar", "mie", "jue", "vie"]


class Horario(models.Model):
    TIPOS = [
        ("laboral", "Laboral"),
        ("academico", "Académico"),
    ]

    nombre = models.CharField(
        max_length=100,
    )

    hora_entrada = models.TimeField()

    hora_salida = models.TimeField()

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
        default="laboral",
    )

    dias_aplicables = models.JSONField(
        default=dias_habiles_por_defecto,
    )

    area = models.CharField(
        max_length=100,
        default="Sin asignar",
    )

    activo = models.BooleanField(default=True)

    tolerancia_minutos = models.PositiveIntegerField(
        default=0
    )

    class Meta:
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["nombre", "area"],
                name="horario_nombre_area_unico",
            )
        ]
        verbose_name = "Horario"
        verbose_name_plural = "Horarios"

    def __str__(self):
        return self.nombre
