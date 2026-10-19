from django.db import models


class Incidencia(models.Model):
    TIPO_TARDANZA = "tardanza"
    TIPO_AUSENCIA = "ausencia"
    TIPO_OTRA = "otra"

    TIPOS = [
        (TIPO_TARDANZA, "Tardanza"),
        (TIPO_AUSENCIA, "Ausencia"),
        (TIPO_OTRA, "Otra"),
    ]

    ESTADO_PENDIENTE = "pendiente"
    ESTADO_REVISADA = "revisada"
    ESTADO_RESUELTA = "resuelta"

    ESTADOS = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_REVISADA, "Revisada"),
        (ESTADO_RESUELTA, "Resuelta"),
    ]

    asistencia = models.ForeignKey(
        "asistencias.RegistroAsistencia",
        on_delete=models.CASCADE,
        related_name="incidencias",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPOS,
    )

    descripcion = models.CharField(
        max_length=300,
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_PENDIENTE,
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Incidencia"
        verbose_name_plural = "Incidencias"

    def __str__(self):
        return (
            f"{self.get_tipo_display()} - "
            f"{self.asistencia.persona}"
        )


class Justificacion(models.Model):
    ESTADO_PENDIENTE = "pendiente"
    ESTADO_APROBADA = "aprobada"
    ESTADO_RECHAZADA = "rechazada"

    ESTADOS = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_APROBADA, "Aprobada"),
        (ESTADO_RECHAZADA, "Rechazada"),
    ]

    incidencia = models.OneToOneField(
        Incidencia,
        on_delete=models.CASCADE,
        related_name="justificacion",
    )

    motivo = models.TextField(
        max_length=500,
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_PENDIENTE,
    )

    observacion_revision = models.CharField(
        max_length=300,
        blank=True,
    )

    fecha_solicitud = models.DateTimeField(
        auto_now_add=True
    )

    fecha_revision = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-fecha_solicitud"]
        verbose_name = "Justificación"
        verbose_name_plural = "Justificaciones"

    def __str__(self):
        return (
            f"Justificación de "
            f"{self.incidencia.asistencia.persona}"
        )