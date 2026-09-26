from django.db import models


class Persona(models.Model):
    codigo = models.CharField(
        max_length=30,
        unique=True,
        verbose_name="Código"
    )

    nombres = models.CharField(
        max_length=100,
        verbose_name="Nombres"
    )

    apellidos = models.CharField(
        max_length=100,
        verbose_name="Apellidos"
    )

    activo = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    fecha_actualizacion = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["apellidos", "nombres"]
        verbose_name = "Persona"
        verbose_name_plural = "Personas"

    def __str__(self):
        return f"{self.codigo} - {self.nombres} {self.apellidos}"