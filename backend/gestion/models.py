from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AuditEvent(models.Model):
    ACTIONS = [
        ("CREATE", "Creación"),
        ("UPDATE", "Modificación"),
        ("DELETE", "Eliminación"),
        ("ACCOUNT_CREATED", "Cuenta creada"),
        ("ACCOUNT_UPDATED", "Cuenta actualizada"),
        ("LOGIN", "Inicio de sesión"),
        ("LOGOUT", "Cierre de sesión"),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sga_audit_events",
    )
    entity = models.CharField(max_length=120)
    object_id = models.CharField(max_length=80, blank=True, default="")
    action = models.CharField(max_length=24, choices=ACTIONS)
    changed_fields = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["entity", "created_at"], name="audit_entity_time_idx"),
            models.Index(fields=["action", "created_at"], name="audit_action_time_idx"),
        ]
        verbose_name = "Evento de auditoría"
        verbose_name_plural = "Eventos de auditoría"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Los eventos de auditoría son inmutables.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Los eventos de auditoría no se pueden eliminar.")

    def __str__(self):
        return f"{self.get_action_display()} · {self.entity} · {self.object_id}"
