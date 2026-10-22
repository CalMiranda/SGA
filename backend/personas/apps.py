from django.apps import AppConfig
from django.db.models.signals import post_migrate


SGA_GROUPS = (
    "Administrador",
    "Gestor de asistencia",
    "Supervisor / Docente",
    "Auditor / Dirección",
    "Empleado / Estudiante",
)


def create_sga_groups(**kwargs):
    """Create the role groups used by the SGA API permission policy."""
    from django.contrib.auth.models import Group

    for group_name in SGA_GROUPS:
        Group.objects.get_or_create(name=group_name)


class PersonasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'personas'

    def ready(self):
        post_migrate.connect(
            create_sga_groups,
            sender=self,
            dispatch_uid="personas.create_sga_groups",
        )
