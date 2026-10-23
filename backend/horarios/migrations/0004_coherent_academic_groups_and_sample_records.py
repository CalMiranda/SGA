from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db import migrations


CURRICULUM = {
    1: [
        (1, "Contabilidad Financiera"),
        (1, "Introducción a la Programación I"),
        (1, "Inglés I"),
        (1, "Filosofía"),
        (1, "Matemática I"),
        (1, "Redacción Técnica"),
        (2, "Álgebra Lineal"),
        (2, "Contabilidad de Costo"),
        (2, "Inglés II"),
        (2, "Matemática II"),
        (2, "Programación I"),
        (2, "Sociología"),
    ],
    2: [
        (3, "Contabilidad Gerencial"),
        (3, "Cultura de Paz y Derechos Humanos"),
        (3, "Estadísticas I"),
        (3, "Ingeniería Económica"),
        (3, "Matemática III"),
        (3, "Programación II"),
        (4, "Base de Datos I"),
        (4, "Microeconomía"),
        (4, "Estadísticas II"),
        (4, "Finanzas I"),
        (4, "Física I"),
    ],
    3: [
        (5, "Métodos Numéricos"),
        (5, "Base de Datos II"),
        (5, "Macroeconomía"),
        (5, "Física II"),
        (5, "Mercadotecnia"),
        (5, "Producción I"),
        (6, "Arquitectura de Máquina"),
        (6, "Finanzas II"),
        (6, "Ingeniería de Software I"),
        (6, "Investigación de Operaciones I"),
        (6, "Organización I"),
        (6, "Producción II"),
    ],
    4: [
        (7, "Aplicaciones Gráficas y Multimedia"),
        (7, "Ingeniería de Software II"),
        (7, "Investigación de Operaciones II"),
        (7, "Organización II"),
        (7, "Producción III"),
        (7, "Sistemas Operativos"),
        (8, "Historia de CA y Nicaragua"),
        (8, "Ingeniería de Sistemas"),
        (8, "Inteligencia Artificial"),
        (8, "Metodología de la Investigación"),
        (8, "Sistemas Operativos de Redes"),
    ],
    5: [
        (9, "Auditoría de Sistemas"),
        (9, "Formulación y Evaluación de Proyectos"),
        (9, "Modelación y Simulación de Sistemas"),
        (9, "Sistemas de Información"),
        (9, "Tecnología y Medio Ambiente"),
        (10, "Administración Informática"),
        (10, "Administración de Proyectos"),
        (10, "Diseño de Sistema en Internet"),
        (10, "Ética Profesional"),
        (10, "Sistemas de Manufactura"),
    ],
}

NEW_STUDENTS = [
    ("2025-1001I", "Sofía", "Herrera Morales", "1M3-SIS-S"),
    ("2025-1002u", "Gabriel", "Ruiz Mendoza", "1T3-SIS-S"),
    ("2025-1003I", "Valeria", "Silva Castillo", "1S3-SIS-S"),
    ("2024-2001u", "Andrea", "Ríos Navarro", "2M3-SIS-S"),
    ("2024-2002I", "Diego", "Morales Zeledón", "2T3-SIS-S"),
    ("2024-2003u", "Camila", "Torres Duarte", "2S3-SIS-S"),
    ("2023-3001I", "Natalia", "Méndez Salazar", "3M3-SIS-S"),
    ("2023-3002u", "Kevin", "López Pineda", "3T3-SIS-S"),
    ("2023-3003I", "Daniela", "Cruz Romero", "3S3-SIS-S"),
    ("2022-4001u", "Sebastián", "Arias Molina", "4M3-SIS-S"),
    ("2022-4002I", "Fernanda", "Vega Castillo", "4T3-SIS-S"),
    ("2022-4003u", "Julio César", "Flores Ramos", "4S3-SIS-S"),
]

ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"}


def _shift_times(group):
    shift = group[1].upper()
    if shift == "M":
        return time(7), time(9)
    if shift == "T":
        return time(13), time(15)
    return time(18), time(20)


def _get_schedule(Horario, semester, subject, group):
    start, end = _shift_times(group)
    schedule, _ = Horario.objects.get_or_create(
        nombre=f"{ROMAN[semester]} Semestre - {subject}",
        area=group,
        defaults={
            "hora_entrada": start,
            "hora_salida": end,
            "tipo": "academico",
            "dias_aplicables": ["lun", "mar", "mie", "jue", "vie"],
            "activo": True,
            "tolerancia_minutos": 10,
        },
    )
    if not schedule.activo:
        schedule.activo = True
        schedule.save(update_fields=["activo"])
    return schedule


def populate_academic_groups(apps, schema_editor):
    Horario = apps.get_model("horarios", "Horario")
    Persona = apps.get_model("personas", "Persona")
    Registro = apps.get_model("asistencias", "RegistroAsistencia")

    fifth_groups = ["5M3-SIS-S", "5T3-SIS-S", "5S3-SIS-S"]
    schedules_by_group = {}

    # Quinto año: los tres grupos usan IX y X semestre.
    for group in fifth_groups:
        schedules = [
            _get_schedule(Horario, semester, subject, group)
            for semester, subject in CURRICULUM[5]
        ]
        schedules_by_group[group] = schedules

        # Aparca temporalmente los registros para evitar choques con la
        # restricción persona + horario + fecha al reasignar los cursos.
        temporary = []
        for index in range(10):
            schedule, _ = Horario.objects.get_or_create(
                nombre=f"__REASIGNACION__ {group} {index + 1}",
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

        grouped_records = defaultdict(list)
        records = Registro.objects.filter(persona__area=group).order_by("persona_id", "fecha", "id")
        for record in records:
            grouped_records[(record.persona_id, record.fecha)].append(record)

        for day_records in grouped_records.values():
            if len(day_records) > len(temporary):
                raise RuntimeError(f"Más de 10 asistencias en una fecha para un estudiante de {group}.")
            for index, record in enumerate(day_records):
                Registro.objects.filter(pk=record.pk).update(horario_id=temporary[index].pk)
            for index, record in enumerate(day_records):
                Registro.objects.filter(pk=record.pk).update(horario_id=schedules_by_group[group][index].pk)

        Horario.objects.filter(
            area=group,
            tipo="academico",
        ).exclude(pk__in=[schedule.pk for schedule in schedules]).update(activo=False)
        Horario.objects.filter(pk__in=[schedule.pk for schedule in temporary]).delete()

    # Primero a cuarto año: tres turnos por año y cursos en sus dos semestres.
    for code, first_name, last_name, group in NEW_STUDENTS:
        year = int(group[0])
        year_schedules = [
            _get_schedule(Horario, semester, subject, group)
            for semester, subject in CURRICULUM[year]
        ]
        Persona.objects.get_or_create(
            codigo=code,
            defaults={
                "nombres": first_name,
                "apellidos": last_name,
                "correo": "",
                "rol": "estudiante",
                "area": group,
                "activo": True,
            },
        )

        student = Persona.objects.get(codigo=code)
        existing = Registro.objects.filter(persona=student).exists()
        if existing:
            continue

        start_date = date(2026, 9, 24)
        end_date = date(2026, 10, 23)
        class_index = 0
        day_index = 0
        current = start_date
        while current <= end_date:
            if current.weekday() < 5:
                # La primera mitad del mes registra el primer semestre y la
                # segunda mitad el segundo semestre del mismo año académico.
                semester = 2 * year - 1 if current < date(2026, 10, 9) else 2 * year
                semester_schedules = [
                    schedule for schedule in year_schedules
                    if schedule.nombre.startswith(f"{ROMAN[semester]} Semestre - ")
                ]
                schedule = semester_schedules[class_index % len(semester_schedules)]
                pattern = (day_index + int(code[-5:-1])) % 20
                state = "ausencia" if pattern == 0 else "tardanza" if pattern in {1, 2, 3} else "justificada" if pattern == 4 else "presente"
                hour = schedule.hora_entrada
                if state == "tardanza":
                    hour = (datetime.combine(current, hour) + timedelta(minutes=13)).time()
                Registro.objects.create(
                    persona=student,
                    horario=schedule,
                    fecha=current,
                    hora_registro=hour,
                    estado=state,
                    observacion="",
                )
                class_index += 1
                day_index += 1
            current += timedelta(days=1)


class Migration(migrations.Migration):
    dependencies = [
        ("horarios", "0003_schedule_name_unique_per_area"),
        ("personas", "0003_persona_usuario"),
        ("asistencias", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(populate_academic_groups, migrations.RunPython.noop),
    ]
