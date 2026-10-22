"""Generate the four UWE figures from the implemented SGA model and routes.

The SVG files are the editable masters. PNGs are rendered from these SVGs for
Word, where the existing image frames preserve the report's pagination.
"""

from pathlib import Path
from xml.sax.saxutils import escape


OUT = Path(__file__).resolve().parent
NAVY = "#17324f"
INK = "#1d2d3f"
MUTED = "#54677b"
LINE = "#7f98af"
GREEN = "#237a52"
PALE = "#e8f5ed"
BLUE = "#eaf2fb"
PALE_LINE = "#d5e0eb"


def t(x, y, value, size=25, color=INK, weight=400, anchor="start"):
    return (f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">'
            f'{escape(value)}</text>')


def rect(x, y, w, h, fill="white", stroke=LINE, radius=12, sw=2):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')


def path(d, color=LINE, width=3, dash=""):
    extra = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}"{extra}/>'


def base(w, h, title, subtitle):
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        t(55, 66, title, 37, NAVY, 700),
        t(55, 105, subtitle, 22, MUTED),
        path(f"M55 126 H{w-55}", PALE_LINE, 2),
    ]


def actor(x, y, labels):
    parts = [
        f'<circle cx="{x}" cy="{y-44}" r="17" fill="white" stroke="{NAVY}" stroke-width="3"/>',
        path(f"M{x} {y-27} V{y+28} M{x-29} {y-7} H{x+29} M{x} {y+28} L{x-27} {y+68} M{x} {y+28} L{x+27} {y+68}", NAVY, 3),
    ]
    for i, label in enumerate(labels):
        parts.append(t(x, y+103+i*29, label, 21, NAVY, 700, "middle"))
    return parts


def use_case(cx, cy, label, stereotype="process", rx=350):
    return [
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="41" fill="{PALE}" stroke="{GREEN}" stroke-width="2.5"/>',
        t(cx, cy-7, f"«{stereotype}»", 18, MUTED, 400, "middle"),
        t(cx, cy+22, label, 27, INK, 700, "middle"),
    ]


def c1():
    a = base(1600, 1050, "UWE · Casos de uso de procesos — SGA", "Operaciones implementadas y actores autorizados en la versión local")
    a += [rect(350, 153, 950, 804, "#fbfdff", "#a7b7c8", 17, 2)]
    a += actor(150, 225, ["Administrador"])
    a += actor(150, 550, ["Administrador /", "Gestor de asistencia"])
    a += actor(150, 855, ["Administrador /", "Auditor / Dirección"])
    a += actor(1450, 855, ["Empleado / Estudiante"])
    a += [path("M180 218 H465", LINE, 3)]
    operation_cases = [
        (370, "Gestionar personas y horarios"),
        (535, "Registrar y consultar asistencia"),
        (700, "Gestionar incidencias y justificaciones"),
    ]
    for y, _ in operation_cases:
        a.append(path(f"M180 543 L465 {y}", LINE, 3))
    a += [path("M180 848 H380", LINE, 3), path("M1270 848 H1420", LINE, 3)]
    a += use_case(825, 218, "Administrar cuentas y roles", "process", 360)
    for y, label in operation_cases:
        a += use_case(825, y, label, "process", 360)
    a += [
        *use_case(570, 848, "Consultar auditoría", "process", 190),
        *use_case(1080, 848, "Consultar historial propio", "process", 190),
        "</svg>",
    ]
    return "".join(a)


def c2():
    a = base(1600, 1050, "UWE · Casos de uso navegacionales — SGA", "Módulos y permisos de consulta o gestión por rol")
    x0, y0, first_col, row_h = 70, 170, 300, 102
    columns = ["Dashboard", "Personas", "Horarios", "Asistencia", "Incidencias", "Reportes", "Auditoría", "Configuración", "Mi historial"]
    cell_w = 1160 / len(columns)
    rows = [
        ("Administrador", ["C", "G", "G", "G", "G", "C", "C", "G", ""]),
        ("Gestor de asistencia", ["C", "G", "G", "G", "G", "C", "", "", ""]),
        ("Supervisor / Docente", ["C", "C", "C", "C", "C", "C", "", "", ""]),
        ("Auditor / Dirección", ["C", "C", "C", "C", "C", "C", "C", "", ""]),
        ("Empleado / Estudiante", ["", "", "", "", "", "", "", "", "C"]),
    ]
    a += [rect(x0, y0, first_col + 1160, row_h * (len(rows) + 1), "white", "#a7b7c8", 10, 2),
          rect(x0, y0, first_col, row_h, "#eaf2fb", "#a7b7c8", 0, 1)]
    a.append(t(x0 + 18, y0 + 60, "Rol de acceso", 22, NAVY, 700))
    for index, label in enumerate(columns):
        x = x0 + first_col + index * cell_w
        a.append(rect(x, y0, cell_w, row_h, "#eaf2fb", "#a7b7c8", 0, 1))
        if label == "Mi historial":
            a += [t(x + cell_w / 2, y0 + 45, "Mi", 17, NAVY, 700, "middle"), t(x + cell_w / 2, y0 + 67, "historial", 17, NAVY, 700, "middle")]
        else:
            a.append(t(x + cell_w / 2, y0 + 58, label, 17, NAVY, 700, "middle"))
    for row_index, (role, access) in enumerate(rows):
        y = y0 + row_h * (row_index + 1)
        a.append(rect(x0, y, first_col, row_h, "#fbfdff", "#d5e0eb", 0, 1))
        a.append(t(x0 + 18, y + 58, role, 20, NAVY, 700))
        for col_index, value in enumerate(access):
            x = x0 + first_col + col_index * cell_w
            a.append(rect(x, y, cell_w, row_h, "white", "#d5e0eb", 0, 1))
            if value:
                color = GREEN if value == "G" else "#2868bc"
                fill = PALE if value == "G" else BLUE
                a += [f'<circle cx="{x + cell_w / 2}" cy="{y + row_h / 2}" r="20" fill="{fill}" stroke="{color}" stroke-width="2"/>',
                      t(x + cell_w / 2, y + row_h / 2 + 7, value, 20, color, 700, "middle")]
    a += [
        rect(70, 825, 1460, 88, "#fbfdff", "#d5e0eb", 10, 1.5),
        f'<circle cx="110" cy="869" r="18" fill="{PALE}" stroke="{GREEN}" stroke-width="2"/>',
        t(110, 876, "G", 19, GREEN, 700, "middle"),
        t(140, 877, "Gestiona y modifica los datos permitidos", 19, MUTED),
        f'<circle cx="700" cy="869" r="18" fill="{BLUE}" stroke="#2868bc" stroke-width="2"/>',
        t(700, 876, "C", 19, "#2868bc", 700, "middle"),
        t(730, 877, "Consulta sin modificar", 19, MUTED),
        t(70, 967, "Las rutas requieren autenticación. El servidor aplica estos permisos en cada solicitud.", 21, MUTED),
        "</svg>",
    ]
    return "".join(a)


def entity(x, y, w, h, name, fields, accent=False):
    fill = PALE if accent else "white"
    stroke = GREEN if accent else LINE
    a = [rect(x, y, w, h, fill, stroke, 7, 2.5),
         t(x+w/2, y+43, name, 28, NAVY, 700, "middle"),
         t(x+w/2, y+70, "«content»", 18, MUTED, 400, "middle"),
         path(f"M{x} {y+88} H{x+w}", stroke, 2)]
    for i, field in enumerate(fields):
        a.append(t(x+20, y+128+i*32, field, 22, INK))
    return a


def c3():
    a = base(1600, 1180, "UWE · Modelo de contenido — SGA", "Entidades persistidas y relaciones implementadas en Django")
    a += entity(65, 165, 370, 250, "auth.User", [
        "id (PK), username", "email, first_name, last_name", "is_active, is_staff", "groups (roles Django)",
    ])
    a += entity(65, 455, 370, 325, "Persona", [
        "id (PK)", "codigo (único)", "nombres, apellidos, correo", "rol, area, activo", "usuario_id (FK, único, opcional)",
    ], True)
    a += entity(65, 830, 370, 280, "Horario", [
        "id (PK)", "nombre (único)", "hora_entrada, hora_salida", "tipo, días, area", "activo, tolerancia_minutos",
    ])
    a += entity(585, 335, 430, 430, "RegistroAsistencia", [
        "id (PK)", "persona_id (FK)", "horario_id (FK)", "fecha, hora_registro", "estado, observacion",
        "único: persona + horario + fecha",
    ], True)
    a += entity(1145, 165, 385, 290, "Incidencia", [
        "id (PK)", "asistencia_id (FK)", "tipo, descripcion, estado", "fecha_creacion",
    ])
    a += entity(1145, 520, 385, 330, "Justificacion", [
        "id (PK)", "incidencia_id (FK, único)", "motivo, estado", "observacion_revision", "fecha_solicitud, fecha_revision",
    ])
    a += entity(1145, 900, 385, 205, "AuditEvent", [
        "id (PK), actor_id (FK, anulable)", "acción, entidad, object_id", "campos modificados, fecha",
    ], True)
    a += [
        path("M250 415 V455", LINE, 3),
        path("M435 615 H585", LINE, 3),
        path("M435 945 H500 V705 H585", LINE, 3),
        path("M1015 480 H1085 V310 H1145", LINE, 3),
        path("M1337 455 V520", LINE, 3),
        path("M435 270 H1095 V990 H1145", LINE, 3),
        t(265, 435, "0..1", 19, GREEN, 700), t(265, 452, "0..1", 19, GREEN, 700),
        t(448, 600, "1", 20, GREEN, 700), t(535, 600, "0..*", 20, GREEN, 700),
        t(448, 932, "1", 20, GREEN, 700), t(540, 728, "0..*", 20, GREEN, 700),
        t(1026, 465, "1", 20, GREEN, 700), t(1095, 295, "0..*", 20, GREEN, 700),
        t(1350, 482, "1", 19, GREEN, 700), t(1350, 515, "0..1", 19, GREEN, 700),
        t(458, 255, "0..*", 19, GREEN, 700), t(1082, 1018, "0..1", 19, GREEN, 700),
        t(65, 1135, "La bitácora conserva el actor y los nombres de campos modificados; no almacena contraseñas ni valores anteriores.", 20, MUTED),
        "</svg>",
    ]
    return "".join(a)


def nav_card(x, y, label, route, detail):
    return [rect(x, y, 900, 118, BLUE, "#7998b7", 12, 2.2),
            t(x+30, y+48, label, 30, NAVY, 700),
            t(x+870, y+46, route, 22, MUTED, 400, "end"),
            t(x+30, y+91, detail, 23, INK)]


def c4():
    a = base(1700, 1120, "UWE · Modelo de navegación — SGA", "Recorridos web definidos por autenticación y permisos de rol")
    a += [
        rect(600, 155, 500, 88, "#fff6ea", "#bd8b4c", 13, 2.2),
        t(850, 192, "Inicio de sesión", 27, NAVY, 700, "middle"),
        t(850, 221, "/login · cookies JWT + CSRF", 19, MUTED, 400, "middle"),
        rect(600, 300, 500, 88, BLUE, "#7998b7", 13, 2.2),
        t(850, 338, "Sesión validada y rol comprobado", 25, NAVY, 700, "middle"),
        t(850, 367, "API protegida por permisos del servidor", 18, MUTED, 400, "middle"),
        path("M850 243 V300", LINE, 3),
        path("M850 388 L295 470", LINE, 3),
        path("M850 388 V470", LINE, 3),
        path("M850 388 L1405 470", LINE, 3),
        rect(55, 470, 480, 535, "#fbfdff", "#a7b7c8", 14, 2),
        rect(560, 470, 480, 535, "#fbfdff", "#a7b7c8", 14, 2),
        rect(1065, 470, 480, 535, "#fbfdff", "#a7b7c8", 14, 2),
        t(295, 514, "Módulos operativos", 24, NAVY, 700, "middle"),
        t(295, 542, "Admin y Gestor gestionan; Supervisor y Auditor consultan", 15, MUTED, 400, "middle"),
        t(800, 514, "Funciones de control", 24, NAVY, 700, "middle"),
        t(800, 542, "Disponibles según permisos específicos", 16, MUTED, 400, "middle"),
        t(1305, 514, "Autoservicio", 24, NAVY, 700, "middle"),
        t(1305, 542, "Solo datos de la ficha vinculada", 16, MUTED, 400, "middle"),
    ]
    operational = [
        (75, 585, "Dashboard", "/dashboard"), (305, 585, "Personas", "/personas"),
        (75, 710, "Horarios", "/horarios"), (305, 710, "Asistencia", "/asistencias"),
        (75, 835, "Incidencias", "/incidencias"), (305, 835, "Reportes", "/reportes"),
    ]
    for x, y, label, route in operational:
        a += [rect(x, y, 210, 94, BLUE, "#7998b7", 11, 1.8),
              t(x+15, y+39, label, 20, NAVY, 700),
              t(x+15, y+70, route, 17, MUTED)]
    a += [
        rect(585, 610, 430, 135, PALE, GREEN, 11, 1.8),
        t(800, 655, "Auditoría", 22, NAVY, 700, "middle"),
        t(800, 687, "/auditoria", 18, MUTED, 400, "middle"),
        t(800, 720, "Administrador y Auditor / Dirección", 17, MUTED, 400, "middle"),
        rect(585, 785, 430, 135, BLUE, "#7998b7", 11, 1.8),
        t(800, 830, "Configuración", 22, NAVY, 700, "middle"),
        t(800, 862, "/configuracion", 18, MUTED, 400, "middle"),
        t(800, 895, "Solo Administrador", 17, MUTED, 400, "middle"),
        rect(1090, 650, 430, 170, PALE, GREEN, 11, 1.8),
        t(1305, 697, "Mi historial", 23, NAVY, 700, "middle"),
        t(1305, 730, "/mi-historial", 18, MUTED, 400, "middle"),
        t(1305, 774, "Empleado / Estudiante · lectura propia", 17, MUTED, 400, "middle"),
        rect(55, 1035, 1490, 56, "#fffaf0", "#dec896", 10, 1.5),
        t(80, 1070, "El acceso de autoservicio está limitado a la persona vinculada; no permite consultar el padrón ni los módulos operativos.", 19, MUTED),
        "</svg>",
    ]
    return "".join(a)


def main():
    assets = {
        "UWE_01_Casos_Uso_Procesos": c1(),
        "UWE_02_Casos_Uso_Navegacionales": c2(),
        "UWE_03_Modelo_Contenido": c3(),
        "UWE_04_Modelo_Navegacion": c4(),
        "uwe-casos-uso-navegacionales-sga-corregido": c2(),
    }
    for name, svg in assets.items():
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(OUT / f"{name}.svg")


if __name__ == "__main__":
    main()
