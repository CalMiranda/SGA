import horarios.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("horarios", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="horario",
            name="tipo",
            field=models.CharField(
                choices=[("laboral", "Laboral"), ("academico", "Académico")],
                default="laboral",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="horario",
            name="dias_aplicables",
            field=models.JSONField(default=horarios.models.dias_habiles_por_defecto),
        ),
        migrations.AddField(
            model_name="horario",
            name="area",
            field=models.CharField(default="Sin asignar", max_length=100),
        ),
        migrations.AddField(
            model_name="horario",
            name="activo",
            field=models.BooleanField(default=True),
        ),
    ]
