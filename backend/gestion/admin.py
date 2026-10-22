from django.contrib import admin

from .models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "entity", "object_id")
    list_filter = ("action", "entity", "created_at")
    search_fields = ("actor__username", "entity", "object_id")
    readonly_fields = tuple(field.name for field in AuditEvent._meta.fields)
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_staff)

    def has_delete_permission(self, request, obj=None):
        return False
