from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from config.permissions import EMPLOYEE_ROLE
from asistencias.serializers import RegistroAsistenciaSerializer
from personas.models import Persona

from .models import AuditEvent


SGA_ROLES = (
    "Administrador",
    "Gestor de asistencia",
    "Supervisor / Docente",
    "Auditor / Dirección",
    EMPLOYEE_ROLE,
)

ROLE_DETAILS = (
    {
        "name": "Administrador",
        "description": "Gestiona cuentas, roles y datos del sistema.",
    },
    {
        "name": "Gestor de asistencia",
        "description": "Registra y modifica personas, horarios, asistencia e incidencias.",
    },
    {
        "name": "Supervisor / Docente",
        "description": "Consulta los módulos operativos sin modificarlos.",
    },
    {
        "name": "Auditor / Dirección",
        "description": "Consulta los módulos operativos y la bitácora de cambios.",
    },
    {
        "name": EMPLOYEE_ROLE,
        "description": "Consulta únicamente su propio historial de asistencia.",
    },
)


def account_role(user):
    return next(
        (name for name in SGA_ROLES if user.groups.filter(name=name).exists()),
        "",
    )


def account_persona(user):
    try:
        return user.persona
    except Persona.DoesNotExist:
        return None


class ManagedAccountSerializer(serializers.ModelSerializer):
    class AccountRoleField(serializers.ChoiceField):
        def get_attribute(self, instance):
            return instance

        def to_representation(self, user):
            return account_role(user)

    @extend_schema_field(OpenApiTypes.INT)
    class PersonaIdField(serializers.Field):
        def get_attribute(self, instance):
            return instance

        def to_representation(self, user):
            persona = account_persona(user)
            return persona.pk if persona else None

        def to_internal_value(self, data):
            if data in (None, ""):
                return None
            if isinstance(data, bool) or not str(data).isdigit():
                raise serializers.ValidationError("Selecciona una persona válida.")
            try:
                return int(data)
            except (TypeError, ValueError) as error:
                raise serializers.ValidationError(
                    "Selecciona una persona válida."
                ) from error

    role = AccountRoleField(choices=[(name, name) for name in SGA_ROLES])
    persona_id = PersonaIdField(required=False, allow_null=True)
    persona_nombre = serializers.SerializerMethodField()
    persona_codigo = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "role",
            "persona_id",
            "persona_nombre",
            "persona_codigo",
            "password",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["id", "persona_nombre", "persona_codigo", "last_login", "date_joined"]

    @extend_schema_field(OpenApiTypes.STR)
    def get_persona_nombre(self, user):
        persona = account_persona(user)
        return f"{persona.nombres} {persona.apellidos}".strip() if persona else ""

    @extend_schema_field(OpenApiTypes.STR)
    def get_persona_codigo(self, user):
        persona = account_persona(user)
        return persona.codigo if persona else ""

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El usuario es obligatorio.")
        user_model = get_user_model()
        conflicts = user_model.objects.filter(
            Q(username__iexact=value) | Q(email__iexact=value)
        )
        if self.instance:
            conflicts = conflicts.exclude(pk=self.instance.pk)
        if conflicts.exists():
            raise serializers.ValidationError(
                "El usuario coincide con una cuenta existente o con su correo."
            )
        return value

    def validate_email(self, value):
        value = value.strip()
        if not value:
            return value
        user_model = get_user_model()
        conflicts = user_model.objects.filter(
            Q(email__iexact=value) | Q(username__iexact=value)
        )
        if self.instance:
            conflicts = conflicts.exclude(pk=self.instance.pk)
        if conflicts.exists():
            raise serializers.ValidationError(
                "El correo coincide con otra cuenta y no se podría usar para iniciar sesión."
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        request = self.context.get("request")
        role = attrs.get("role", account_role(instance) if instance else "")

        if instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Define una contraseña inicial de al menos 12 caracteres."}
            )

        if not role:
            raise serializers.ValidationError({"role": "Selecciona un rol de acceso."})

        if instance and request and instance.pk == request.user.pk:
            if role != account_role(instance) or attrs.get("is_active", instance.is_active) is False:
                raise serializers.ValidationError(
                    "No puedes cambiar tu propio rol ni desactivar tu cuenta."
                )

        if "password" in attrs:
            try:
                validate_password(attrs["password"], user=instance)
            except DjangoValidationError as error:
                raise serializers.ValidationError({"password": list(error.messages)}) from error

        current_persona = account_persona(instance) if instance else None
        persona_id = attrs.get(
            "persona_id",
            current_persona.pk if current_persona else None,
        )
        if role == EMPLOYEE_ROLE:
            if not persona_id:
                raise serializers.ValidationError(
                    {"persona_id": "Vincula una ficha personal para habilitar Mi historial."}
                )
            try:
                persona = Persona.objects.get(pk=persona_id, activo=True)
            except Persona.DoesNotExist as error:
                raise serializers.ValidationError(
                    {"persona_id": "Selecciona una persona activa."}
                ) from error
            if persona.usuario_id and (not instance or persona.usuario_id != instance.pk):
                raise serializers.ValidationError(
                    {"persona_id": "Esta persona ya está vinculada a otra cuenta."}
                )
        elif attrs.get("persona_id") is not None:
            raise serializers.ValidationError(
                {"persona_id": "Solo el rol Empleado / Estudiante se vincula a una persona."}
            )

        return attrs

    def create(self, validated_data):
        user_model = get_user_model()
        role = validated_data.pop("role")
        persona_id = validated_data.pop("persona_id", None)
        password = validated_data.pop("password")
        user = user_model.objects.create_user(password=password, **validated_data)
        user.groups.set([Group.objects.get_or_create(name=role)[0]])
        if role == EMPLOYEE_ROLE and persona_id:
            persona = Persona.objects.get(pk=persona_id)
            persona.usuario = user
            persona.save(update_fields=["usuario"])
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", account_role(instance))
        persona_id = validated_data.pop("persona_id", None)
        password = validated_data.pop("password", None)
        old_persona = account_persona(instance)

        for name, value in validated_data.items():
            setattr(instance, name, value)
        if password:
            instance.set_password(password)
        instance.save()
        instance.groups.set([Group.objects.get_or_create(name=role)[0]])

        if old_persona and role != EMPLOYEE_ROLE:
            old_persona.usuario = None
            old_persona.save(update_fields=["usuario"])
        elif role == EMPLOYEE_ROLE:
            selected_persona = (
                Persona.objects.get(pk=persona_id)
                if persona_id is not None
                else old_persona
            )
            if old_persona and selected_persona and old_persona.pk != selected_persona.pk:
                old_persona.usuario = None
                old_persona.save(update_fields=["usuario"])
            if selected_persona and selected_persona.usuario_id != instance.pk:
                selected_persona.usuario = instance
                selected_persona.save(update_fields=["usuario"])
        return instance


class AuditEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", allow_null=True, read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "created_at",
            "actor_username",
            "action",
            "action_display",
            "entity",
            "object_id",
            "changed_fields",
        ]


class RoleDescriptionSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField()


class AuditEventListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    limit = serializers.IntegerField()
    results = AuditEventSerializer(many=True)


class PersonalJustificationSerializer(serializers.Serializer):
    motivo = serializers.CharField()
    estado = serializers.CharField()
    observacion_revision = serializers.CharField(allow_blank=True)


class PersonalIncidentSerializer(serializers.Serializer):
    tipo = serializers.CharField()
    descripcion = serializers.CharField()
    estado = serializers.CharField()
    justificacion = PersonalJustificationSerializer(allow_null=True)


class PersonalAttendanceSerializer(RegistroAsistenciaSerializer):
    incidencias = PersonalIncidentSerializer(many=True, read_only=True)

    class Meta(RegistroAsistenciaSerializer.Meta):
        fields = [*RegistroAsistenciaSerializer.Meta.fields, "incidencias"]


class PersonalHistoryPersonSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    rol = serializers.CharField()
    area = serializers.CharField()


class PersonalHistorySummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    presente = serializers.IntegerField()
    tardanza = serializers.IntegerField()
    ausencia = serializers.IntegerField()
    justificada = serializers.IntegerField()
    limitado = serializers.BooleanField()


class PersonalHistorySerializer(serializers.Serializer):
    persona = PersonalHistoryPersonSerializer()
    resumen = PersonalHistorySummarySerializer()
    registros = PersonalAttendanceSerializer(many=True)
