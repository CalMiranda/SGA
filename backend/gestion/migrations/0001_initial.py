from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("entity", models.CharField(max_length=120)),
                ("object_id", models.CharField(blank=True, default="", max_length=80)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("CREATE", "Creación"),
                            ("UPDATE", "Modificación"),
                            ("DELETE", "Eliminación"),
                            ("ACCOUNT_CREATED", "Cuenta creada"),
                            ("ACCOUNT_UPDATED", "Cuenta actualizada"),
                            ("LOGIN", "Inicio de sesión"),
                            ("LOGOUT", "Cierre de sesión"),
                        ],
                        max_length=24,
                    ),
                ),
                ("changed_fields", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sga_audit_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Evento de auditoría",
                "verbose_name_plural": "Eventos de auditoría",
                "ordering": ["-created_at", "-id"],
                "indexes": [
                    models.Index(fields=["entity", "created_at"], name="audit_entity_time_idx"),
                    models.Index(fields=["action", "created_at"], name="audit_action_time_idx"),
                ],
            },
        ),
    ]
