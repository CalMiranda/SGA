from django.conf import settings
from django.db import models


class Persona(models.Model):
    ROLES = [
        ("estudiante", "Estudiante"),
        ("docente", "Docente"),
        ("administrativo", "Administrativo"),
        ("otro", "Otro"),
    ]

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

    correo = models.EmailField(
        default="",
        verbose_name="Correo electrónico",
    )

    rol = models.CharField(
        max_length=20,
        choices=ROLES,
        default="estudiante",
        verbose_name="Rol institucional",
    )

    area = models.CharField(
        max_length=100,
        default="Sin asignar",
        verbose_name="Grupo o área",
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

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="persona",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["apellidos", "nombres"]
        verbose_name = "Persona"
        verbose_name_plural = "Personas"

    def __str__(self):
        return f"{self.codigo} - {self.nombres} {self.apellidos}"
