from contextlib import contextmanager
from contextvars import ContextVar

from django.db import transaction

from .models import AuditEvent


_current_actor = ContextVar("sga_audit_actor", default=None)


@contextmanager
def audit_scope(actor):
    token = _current_actor.set(actor if getattr(actor, "is_authenticated", False) else None)
    try:
        yield
    finally:
        _current_actor.reset(token)


def current_actor():
    return _current_actor.get()


def record_event(actor, entity, object_id, action, changed_fields=()):
    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        entity=str(entity)[:120],
        object_id=str(object_id or "")[:80],
        action=action,
        changed_fields=sorted({str(field)[:80] for field in changed_fields}),
    )


class AuditModelViewSetMixin:
    """Attach the authenticated actor to model changes made through the API."""

    def perform_create(self, serializer):
        with transaction.atomic(), audit_scope(self.request.user):
            serializer.save()

    def perform_update(self, serializer):
        with transaction.atomic(), audit_scope(self.request.user):
            serializer.save()

    def perform_destroy(self, instance):
        with transaction.atomic(), audit_scope(self.request.user):
            instance.delete()
