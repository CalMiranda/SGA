from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("horarios", "0002_prototype_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="horario",
            name="nombre",
            field=models.CharField(max_length=100),
        ),
        migrations.AddConstraint(
            model_name="horario",
            constraint=models.UniqueConstraint(
                fields=("nombre", "area"),
                name="horario_nombre_area_unico",
            ),
        ),
    ]
