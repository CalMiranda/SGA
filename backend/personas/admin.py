from django.contrib import admin

from gestion.audit import audit_scope
from .models import Persona


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "nombres",
        "apellidos",
        "rol",
        "area",
        "correo",
        "activo",
    )

    search_fields = (
        "codigo",
        "nombres",
        "apellidos",
        "correo",
        "area",
    )

    list_filter = (
        "rol",
        "area",
        "activo",
    )

    def save_model(self, request, obj, form, change):
        with audit_scope(request.user):
            super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        with audit_scope(request.user):
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        with audit_scope(request.user):
            super().delete_queryset(request, queryset)
