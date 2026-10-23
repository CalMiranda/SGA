"""Create the first administrator from deployment secrets, once only."""

import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    help = "Crea el primer administrador si no existe."

    def handle(self, *args, **options):
        username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "").strip()
        password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")

        if not username and not password:
            return
        if not username or not password:
            raise CommandError("Configura ambos valores de BOOTSTRAP_ADMIN.")

        user_model = get_user_model()
        existing = user_model.objects.filter(username=username).first()
        if existing:
            if not existing.is_superuser:
                raise CommandError("El nombre de administrador ya pertenece a otra cuenta.")
            return

        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError("La contraseña inicial no cumple la política de seguridad.") from exc

        user_model.objects.create_superuser(username=username, password=password)
        self.stdout.write(self.style.SUCCESS("Administrador inicial creado."))
