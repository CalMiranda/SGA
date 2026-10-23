from collections import defaultdict
from datetime import time

from django.db import migrations


FIFTH_GROUPS = ("5M3-SIS-S", "5T3-SIS-S", "5S3-SIS-S")


def distribute_records(apps, schema_editor):
    Horario = apps.get_model("horarios", "Horario")
    Registro = apps.get_model("asistencias", "RegistroAsistencia")

    for group in FIFTH_GROUPS:
        semester_schedules = [
            list(
                Horario.objects.filter(
                    area=group,
                    tipo="academico",
                    nombre__startswith=f"{roman} Semestre - ",
                ).order_by("nombre")
            )
            for roman in ("IX", "X")
        ]
        if any(len(schedules) != 5 for schedules in semester_schedules):
            raise RuntimeError(f"El grupo {group} debe tener cinco asignaturas activas por semestre IX y X.")

        temporary = []
        for index in range(10):
            schedule, _ = Horario.objects.get_or_create(
                nombre=f"__DISTRIBUCION__ {group} {index + 1}",
                area=group,
                defaults={
                    "hora_entrada": time(0),
                    "hora_salida": time(1),
                    "tipo": "academico",
                    "dias_aplicables": ["lun"],
                    "activo": False,
                    "tolerancia_minutos": 0,
                },
            )
            temporary.append(schedule)

        by_student_day = defaultdict(list)
        records = Registro.objects.filter(persona__area=group).order_by("persona_id", "fecha", "id")
        for record in records:
            by_student_day[(record.persona_id, record.fecha)].append(record)

        student_record_number = defaultdict(int)
        for (student_id, _), day_records in by_student_day.items():
            if len(day_records) > len(temporary):
                raise RuntimeError(f"Más de diez asistencias en una fecha para un estudiante de {group}.")

            for index, record in enumerate(day_records):
                Registro.objects.filter(pk=record.pk).update(horario_id=temporary[index].pk)

            for index, record in enumerate(day_records):
                ordinal = student_record_number[student_id]
                student_record_number[student_id] += 1
                semester_index = ordinal % 2
                course_index = (ordinal // 2) % 5
                schedule = semester_schedules[semester_index][course_index]
                Registro.objects.filter(pk=record.pk).update(horario_id=schedule.pk)

        Horario.objects.filter(pk__in=[schedule.pk for schedule in temporary]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("horarios", "0004_coherent_academic_groups_and_sample_records"),
    ]

    operations = [
        migrations.RunPython(distribute_records, migrations.RunPython.noop),
    ]
