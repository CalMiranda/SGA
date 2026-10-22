from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("personas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="persona",
            name="correo",
            field=models.EmailField(default="", max_length=254, verbose_name="Correo electrónico"),
        ),
        migrations.AddField(
            model_name="persona",
            name="rol",
            field=models.CharField(
                choices=[
                    ("estudiante", "Estudiante"),
                    ("docente", "Docente"),
                    ("administrativo", "Administrativo"),
                    ("otro", "Otro"),
                ],
                default="estudiante",
                max_length=20,
                verbose_name="Rol institucional",
            ),
        ),
        migrations.AddField(
            model_name="persona",
            name="area",
            field=models.CharField(default="Sin asignar", max_length=100, verbose_name="Grupo o área"),
        ),
    ]
