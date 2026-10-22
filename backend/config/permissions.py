from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.core.exceptions import ObjectDoesNotExist


WRITE_ROLES = {"Administrador", "Gestor de asistencia"}
READ_ONLY_ROLES = {"Supervisor / Docente", "Auditor / Dirección"}
EMPLOYEE_ROLE = "Empleado / Estudiante"


class IsSGARoleAllowed(BasePermission):
    """Allow business API reads to authorized roles and writes to managers."""

    message = "Tu rol no tiene permiso para realizar esta operación."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        roles = set(user.groups.values_list("name", flat=True))
        if roles & WRITE_ROLES:
            return True
        return request.method in SAFE_METHODS and bool(roles & READ_ONLY_ROLES)


class IsSystemAdministrator(BasePermission):
    """Restrict account and application configuration to SGA administrators."""

    message = "Solo Administración puede gestionar la configuración del SGA."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.groups.filter(name="Administrador").exists()
            )
        )


class IsAuditReader(BasePermission):
    """Allow administrators and the audit role to read the immutable log."""

    message = "Tu rol no tiene permiso para consultar la bitácora."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.groups.filter(
                    name__in={"Administrador", "Auditor / Dirección"}
                ).exists()
            )
        )


class IsLinkedEmployee(BasePermission):
    """Allow the self-service role only when it is linked to one person."""

    message = "Esta cuenta no tiene una ficha personal activa vinculada."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not user.groups.filter(name=EMPLOYEE_ROLE).exists():
            return False
        try:
            return user.persona.activo
        except ObjectDoesNotExist:
            return False
