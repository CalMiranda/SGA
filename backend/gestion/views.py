from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from asistencias.models import RegistroAsistencia
from asistencias.serializers import RegistroAsistenciaSerializer
from config.permissions import IsAuditReader, IsLinkedEmployee, IsSystemAdministrator
from personas.models import Persona
from personas.serializers import PersonaSerializer

from .audit import record_event, audit_scope
from .models import AuditEvent
from .serializers import (
    AuditEventSerializer,
    AuditEventListSerializer,
    ManagedAccountSerializer,
    PersonalHistorySerializer,
    ROLE_DETAILS,
    RoleDescriptionSerializer,
)


class ManagedAccountViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsSystemAdministrator]
    serializer_class = ManagedAccountSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        user_model = get_user_model()
        return (
            user_model.objects.exclude(is_superuser=True)
            .select_related("persona")
            .prefetch_related("groups")
            .order_by("username")
        )

    def perform_create(self, serializer):
        with transaction.atomic(), audit_scope(self.request.user):
            user = serializer.save()
            record_event(
                self.request.user,
                "auth.User",
                user.pk,
                "ACCOUNT_CREATED",
                ["username", "email", "role", "persona", "is_active"],
            )

    def perform_update(self, serializer):
        changed_fields = set(serializer.validated_data.keys())
        if "password" in changed_fields:
            changed_fields.add("password")
        with transaction.atomic(), audit_scope(self.request.user):
            user = serializer.save()
            record_event(
                self.request.user,
                "auth.User",
                user.pk,
                "ACCOUNT_UPDATED",
                changed_fields,
            )
            if changed_fields & {"password", "role", "is_active"}:
                self._revoke_refresh_tokens(user)

    @staticmethod
    def _revoke_refresh_tokens(user):
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for token in OutstandingToken.objects.filter(user=user).iterator():
            BlacklistedToken.objects.get_or_create(token=token)


class RolesView(APIView):
    permission_classes = [IsSystemAdministrator]

    @extend_schema(responses=RoleDescriptionSerializer(many=True))
    def get(self, request):
        return Response(ROLE_DETAILS)


class ConfigurationPeopleView(APIView):
    permission_classes = [IsSystemAdministrator]

    @extend_schema(responses=PersonaSerializer(many=True))
    def get(self, request):
        queryset = Persona.objects.all().order_by("apellidos", "nombres")
        return Response(PersonaSerializer(queryset, many=True).data)


class AuditEventsView(APIView):
    permission_classes = [IsAuditReader]

    @extend_schema(responses=AuditEventListSerializer)
    def get(self, request):
        queryset = AuditEvent.objects.select_related("actor").all()
        action = request.query_params.get("action", "").strip()
        entity = request.query_params.get("entity", "").strip()
        actor = request.query_params.get("actor", "").strip()
        date_from = request.query_params.get("desde", "").strip()
        date_to = request.query_params.get("hasta", "").strip()
        if action:
            queryset = queryset.filter(action=action)
        if entity:
            queryset = queryset.filter(entity__icontains=entity)
        if actor:
            queryset = queryset.filter(actor__username__icontains=actor)
        for key, value, lookup in (
            ("desde", date_from, "created_at__date__gte"),
            ("hasta", date_to, "created_at__date__lte"),
        ):
            if value:
                parsed = parse_date(value)
                if parsed is None:
                    return Response(
                        {key: "Usa el formato de fecha AAAA-MM-DD."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                queryset = queryset.filter(**{lookup: parsed})
        count = queryset.count()
        try:
            limit = min(max(int(request.query_params.get("limite", "100")), 1), 500)
        except ValueError:
            limit = 100
        results = queryset[:limit]
        return Response({
            "count": count,
            "limit": limit,
            "results": AuditEventSerializer(results, many=True).data,
        })


class MyAttendanceHistoryView(APIView):
    permission_classes = [IsLinkedEmployee]

    @extend_schema(responses=PersonalHistorySerializer)
    def get(self, request):
        persona = request.user.persona
        queryset = (
            RegistroAsistencia.objects.filter(persona=persona)
            .select_related("persona", "horario")
            .prefetch_related("incidencias__justificacion")
            .order_by("-fecha", "-hora_registro", "-id")
        )
        date_values = {}
        for key, lookup in (
            ("desde", "fecha__gte"),
            ("hasta", "fecha__lte"),
        ):
            value = request.query_params.get(key, "").strip()
            if value:
                parsed = parse_date(value)
                if parsed is None:
                    return Response(
                        {key: "Usa el formato de fecha AAAA-MM-DD."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                date_values[key] = parsed
                queryset = queryset.filter(**{lookup: parsed})

        if date_values.get("desde") and date_values.get("hasta") and date_values["desde"] > date_values["hasta"]:
            return Response(
                {"hasta": "La fecha final no puede ser anterior a la fecha inicial."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        state = request.query_params.get("estado", "").strip()
        allowed_states = {choice[0] for choice in RegistroAsistencia.ESTADOS}
        if state and state not in allowed_states:
            return Response(
                {"estado": "El estado seleccionado no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        state_counts = {
            item["estado"]: item["total"]
            for item in queryset.values("estado").annotate(total=Count("id"))
        }
        if state:
            queryset = queryset.filter(estado=state)
        total = queryset.count()
        records = list(queryset[:500])
        serialized_records = RegistroAsistenciaSerializer(records, many=True).data
        incidents_by_attendance = {}
        for record in records:
            items = []
            for incident in record.incidencias.all():
                justification = getattr(incident, "justificacion", None)
                items.append({
                    "tipo": incident.get_tipo_display(),
                    "descripcion": incident.descripcion,
                    "estado": incident.get_estado_display(),
                    "justificacion": ({
                        "motivo": justification.motivo,
                        "estado": justification.get_estado_display(),
                        "observacion_revision": justification.observacion_revision,
                    } if justification else None),
                })
            incidents_by_attendance[record.pk] = items
        for item in serialized_records:
            item["incidencias"] = incidents_by_attendance.get(item["id"], [])

        return Response({
            "persona": {
                "codigo": persona.codigo,
                "nombre": f"{persona.nombres} {persona.apellidos}".strip(),
                "rol": persona.get_rol_display(),
                "area": persona.area,
            },
            "resumen": {
                "total": total,
                "presente": state_counts.get("presente", 0),
                "tardanza": state_counts.get("tardanza", 0),
                "ausencia": state_counts.get("ausencia", 0),
                "justificada": state_counts.get("justificada", 0),
                "limitado": total > 500,
            },
            "registros": serialized_records,
        })
