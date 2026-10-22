from django.apps import AppConfig


class GestionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gestion"
    verbose_name = "Gestión y auditoría del SGA"

    def ready(self):
        from . import signals  # noqa: F401
