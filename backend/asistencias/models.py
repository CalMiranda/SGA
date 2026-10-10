from django.db import models


class RegistroAsistencia(models.Model):
    ESTADO_PRESENTE = "presente"
    ESTADO_TARDANZA = "tardanza"
    ESTADO_AUSENCIA = "ausencia"
    ESTADO_JUSTIFICADA = "justificada"

    ESTADOS = [
        (ESTADO_PRESENTE, "Presente"),
        (ESTADO_TARDANZA, "Tardanza"),
        (ESTADO_AUSENCIA, "Ausencia"),
        (ESTADO_JUSTIFICADA, "Justificada"),
    ]

    persona = models.ForeignKey(
        "personas.Persona",
        on_delete=models.PROTECT,
        related_name="registros_asistencia",
    )

    horario = models.ForeignKey(
        "horarios.Horario",
        on_delete=models.PROTECT,
        related_name="registros_asistencia",
    )

    fecha = models.DateField()

    hora_registro = models.TimeField()

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_PRESENTE,
    )

    observacion = models.CharField(
        max_length=250,
        blank=True,
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = [
            "-fecha",
            "hora_registro",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "persona",
                    "horario",
                    "fecha",
                ],
                name="asistencia_unica_persona_horario_fecha",
            )
        ]

        verbose_name = "Registro de asistencia"
        verbose_name_plural = "Registros de asistencia"

    def __str__(self):
        return (
            f"{self.persona} - "
            f"{self.fecha} - "
            f"{self.get_estado_display()}"
        )