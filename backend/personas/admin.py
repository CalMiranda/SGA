from django.contrib import admin

from .models import Persona


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "nombres",
        "apellidos",
        "activo",
    )

    search_fields = (
        "codigo",
        "nombres",
        "apellidos",
    )

    list_filter = (
        "activo",
    )