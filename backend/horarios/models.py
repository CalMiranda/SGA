from django.db import models


class Horario(models.Model):
    nombre = models.CharField(
        max_length=100,
        unique=True
    )

    hora_entrada = models.TimeField()

    hora_salida = models.TimeField()

    tolerancia_minutos = models.PositiveIntegerField(
        default=0
    )

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Horario"
        verbose_name_plural = "Horarios"

    def __str__(self):
        return self.nombre