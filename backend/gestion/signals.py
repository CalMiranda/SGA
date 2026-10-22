from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver

from .audit import current_actor, record_event


TRACKED_MODELS = {
    "personas.Persona",
    "horarios.Horario",
    "asistencias.RegistroAsistencia",
    "incidencias.Incidencia",
    "incidencias.Justificacion",
}


def _snapshot(instance):
    return {
        field.name: getattr(instance, field.attname)
        for field in instance._meta.concrete_fields
        if not field.primary_key
    }


def _entity(instance):
    return instance._meta.label


@receiver(pre_save)
def capture_before_values(sender, instance, **kwargs):
    if sender._meta.label not in TRACKED_MODELS:
        return
    if instance.pk:
        old = sender._default_manager.filter(pk=instance.pk).first()
        instance._sga_audit_before = _snapshot(old) if old else None
    else:
        instance._sga_audit_before = None


@receiver(post_save)
def record_saved_model(sender, instance, created, **kwargs):
    if sender._meta.label not in TRACKED_MODELS:
        return
    before = getattr(instance, "_sga_audit_before", None)
    after = _snapshot(instance)
    if created:
        action = "CREATE"
        changed_fields = after.keys()
    elif before is not None:
        action = "UPDATE"
        changed_fields = [
            name for name, value in after.items()
            if before.get(name) != value
        ]
    else:
        return
    if changed_fields:
        record_event(current_actor(), _entity(instance), instance.pk, action, changed_fields)


@receiver(pre_delete)
def record_deleted_model(sender, instance, **kwargs):
    if sender._meta.label in TRACKED_MODELS:
        record_event(current_actor(), _entity(instance), instance.pk, "DELETE")
