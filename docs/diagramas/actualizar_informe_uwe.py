"""Replace the four Appendix C images and captions without changing Word frames."""

from pathlib import Path
from copy import deepcopy
from zipfile import ZipFile
from lxml import etree


ROOT = Path(__file__).resolve().parents[3]
ASSETS = Path(__file__).resolve().parent
SOURCE = ROOT / "Proyecto Final - Sistema de Gestion de Alerta.docx"
DEST = ROOT / "Proyecto Final - Sistema de Gestion de Alerta - modulos implementados.docx"

REPLACEMENTS = {
    "word/media/image10.png": ASSETS / "UWE_01_Casos_Uso_Procesos.png",
    "word/media/image11.png": ASSETS / "UWE_02_Casos_Uso_Navegacionales.png",
    "word/media/image12.png": ASSETS / "UWE_03_Modelo_Contenido.png",
    "word/media/image13.png": ASSETS / "UWE_04_Modelo_Navegacion.png",
}
CAPTIONS = {
    "Figura C.1.": "Figura C.1. Casos de uso de procesos implementados y permisos de sus actores en el SGA.",
    "Figura C.2.": "Figura C.2. Casos navegacionales por rol. G = gestiona; C = consulta.",
    "Figura C.3.": "Figura C.3. Modelo de contenido con la relación opcional entre la cuenta y Persona y la bitácora de auditoría.",
    "Figura C.4.": "Figura C.4. Mapa de navegación implementado para módulos operativos, administración, auditoría y autoservicio.",
}
BODY_UPDATES = {
    "Next.js 16.3.6, React 19.2.8 y TypeScript": (
        "Next.js 16.4.2, React 19.2.8 y TypeScript"
    ),
    "backend/config/auth_views.py, authentication.py y permissions.py — vistas de sesión, JWT en cookies, CSRF y permisos por rol.": (
        "backend/config/auth_views.py, authentication.py, permissions.py y backend/gestion/ — sesión JWT en cookies, CSRF, permisos por rol, auditoría y endpoints de configuración e historial."
    ),
    "frontend/src/app/login/page.tsx y frontend/src/lib/api.ts — interfaz de inicio de sesión y cliente de API.": (
        "frontend/src/app/auditoria, /configuracion, /mi-historial, frontend/src/app/login/page.tsx y frontend/src/lib/api.ts — módulos de auditoría, cuentas, autoservicio, inicio de sesión y cliente de API."
    ),
    "El modelo persistente observado contiene": (
        "El modelo persistente incluye Persona, Horario, RegistroAsistencia, Incidencia, Justificacion y AuditEvent. "
        "La ficha Persona mantiene una relación opcional uno a uno con la cuenta de Django para habilitar la consulta personal. "
        "La bitácora conserva el actor, la entidad, la acción, la fecha y los nombres de los campos modificados, sin guardar contraseñas ni valores anteriores."
    ),
    "El entorno Docker local se ejecutó correctamente y el manual incorpora capturas reales de sus pantallas;": (
        "El entorno Docker local se ejecutó correctamente y el manual incluye capturas reales de la aplicación local; los datos personales se ocultaron. "
        "No hay hosting, dominio ni URL pública, por lo que esas imágenes no representan una versión de producción. "
        "Se implementaron reportes, configuración de cuentas y roles, auditoría de eventos e historial personal. "
        "No se ha realizado un piloto institucional ni se han documentado pruebas funcionales, de carga o de seguridad. "
        "El informe diferencia estas funciones implementadas de las validaciones y el alojamiento aún pendientes."
    ),
    "Las relaciones protegen la integridad referencial.": (
        "Las relaciones protegen la integridad referencial: la asistencia referencia persona y horario, la incidencia referencia asistencia y la justificación corresponde a una incidencia. "
        "Persona se vincula opcionalmente uno a uno con una cuenta de Django. AuditEvent registra actor, entidad, acción, identificador, fecha y nombres de campos modificados; no guarda contraseñas ni valores anteriores. "
        "No se modelan sedes ni grupos organizativos, por lo que ese aislamiento requiere definir el alcance con la unidad piloto."
    ),
    "El flujo local parte de /login.": (
        "El flujo local parte de /login y valida sesión y rol en el servidor. Administrador y Gestor usan los módulos operativos; Supervisor / Docente consulta; Administrador gestiona cuentas y configuración; Administrador y Auditor / Dirección consultan la bitácora. "
        "Empleado / Estudiante accede únicamente a /mi-historial cuando su cuenta está vinculada a una ficha Persona activa."
    ),
    "Paso 5. Entre a http://localhost:8000/admin/": (
        "Paso 5. Inicie sesión como Administrador y abra http://localhost:3000/configuracion. Desde esa pantalla puede crear o editar cuentas, asignar un rol, activar o desactivar el acceso y definir una contraseña inicial segura. "
        "Para Empleado / Estudiante, vincule una ficha Persona activa; la cuenta solo podrá consultar su propio historial."
    ),
    "Los perfiles Supervisor / Docente y Auditor / Dirección pueden consultar, pero el servidor rechaza sus operaciones de escritura.": (
        "Supervisor / Docente y Auditor / Dirección pueden consultar los datos autorizados; el servidor rechaza sus operaciones de escritura. "
        "Administrador configura cuentas y roles. Administrador y Auditor / Dirección consultan la bitácora; Empleado / Estudiante ve únicamente el historial de su ficha vinculada. "
        "Las capturas de los módulos operativos corresponden al entorno Docker local; las imágenes del Anexo D son prototipos y no evidencia de producción. "
        "La guía solicita URL pública y capturas de producción, pendientes hasta seleccionar y configurar hosting (Universidad Nacional de Ingeniería, 2026a)."
    ),
    "Para completar la Fase 3 se prepararon autenticación de sesión con JWT en cookies HttpOnly,": (
        "En la Fase 3 se implementaron autenticación con JWT en cookies HttpOnly, protección CSRF, renovación y revocación de sesión, limitación de intentos, encabezados de seguridad y permisos por rol. "
        "También se incorporaron AuditEvent, configuración de cuentas y roles, vínculo entre cuenta y Persona e historial personal de asistencia con alcance restringido al usuario autenticado. "
        "Docker Compose con PostgreSQL y Caddy se levantó localmente; la infraestructura pública todavía no está configurada."
    ),
    "El proyecto todavía no satisface el requisito de URL pública de la guía.": (
        "El proyecto todavía no satisface el requisito de URL pública de la guía. Tampoco cuenta con hosting elegido, pruebas funcionales, de carga o de seguridad documentadas, piloto institucional, capturas de producción ni sincronización de los cambios locales con GitHub. "
        "Antes de su adopción institucional se deben validar los módulos con la unidad piloto, definir el aislamiento por sede o área y establecer el procedimiento de publicación y respaldo. "
        "La auditoría, la asociación de cuentas con personas y el historial personal ya están implementados."
    ),
    "R5. Ampliar los reportes y añadir una bitácora de auditoría si el piloto lo requiere;": (
        "R5. Validar con la unidad piloto la configuración de roles, la bitácora de auditoría y el historial personal; definir retención y alcance organizativo antes de habilitar la adopción institucional."
    ),
    "El módulo /reportes permite consultar asistencia por período, grupo o área, rol y estado,": (
        "El módulo /reportes consulta asistencia por período, grupo o área, rol y estado, e imprime o exporta CSV. Se incorporaron configuración de cuentas y roles, bitácora de eventos e historial propio vinculado a Persona. "
        "Siguen fuera del alcance la carga masiva, SSO/OAuth2, las integraciones externas, el aislamiento por sede y la validación con la organización piloto."
    ),
    "Cuenta de Django y grupos; administración de usuarios en /admin/.": (
        "Cuenta de Django y grupos; administración de usuarios y roles en /configuracion."
    ),
    "Grupo de solo lectura; no hay bitácora de auditoría implementada.": (
        "Grupo de solo lectura; consulta de la bitácora sin permisos para modificarla."
    ),
    "Diseño objetivo; acceso pendiente de vincular la cuenta con Persona.": (
        "Consulta de historial propio; requiere una cuenta vinculada a una ficha Persona activa."
    ),
    "Los reportes por período están implementados; la bitácora de auditoría está pendiente.": (
        "Reportes y bitácora implementados; las pruebas funcionales y de permisos están pendientes."
    ),
    "Pendiente de relación usuario-persona y vista de autoservicio.": (
        "Implementado en /mi-historial; requiere vínculo activo usuario-Persona. Pruebas pendientes."
    ),
    "/reportes está implementada; /auditoria y /mi-historial no están implementadas.": (
        "/reportes, /auditoria y /mi-historial están implementadas y protegidas por permisos de rol."
    ),
    "Solo lectura; bitácora no implementada.": (
        "Solo lectura; consulta de bitácora autorizada."
    ),
}
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def update_captions(data):
    root = etree.fromstring(data)
    found = set()
    updates = {**CAPTIONS, **BODY_UPDATES}
    for paragraph in root.findall(f".//{{{W}}}p"):
        runs = paragraph.findall(f".//{{{W}}}t")
        value = "".join(run.text or "" for run in runs)
        for prefix, replacement in updates.items():
            if value.startswith(prefix):
                if not runs:
                    raise RuntimeError(f"Missing text run for {prefix}")
                runs[0].text = replacement
                for run in runs[1:]:
                    run.text = ""
                found.add(prefix)
    if found != set(updates):
        raise RuntimeError(f"Text not found: {set(updates)-found}")
    row_update_found = False
    for row in root.findall(f".//{{{W}}}tr"):
        cells = row.findall(f"{{{W}}}tc")
        row_text = " ".join(
            text.text or ""
            for text in row.findall(f".//{{{W}}}t")
        )
        if "Rol de diseño pendiente de usuario-persona y vista individual." in row_text:
            replacements = {
                1: "Sí, solo personal",
                3: "Consulta únicamente /api/mi-historial/ para la ficha vinculada; no accede a otros registros.",
            }
            row_update_found = True
            for cell_index, replacement in replacements.items():
                cell_runs = cells[cell_index].findall(f".//{{{W}}}t")
                if not cell_runs:
                    raise RuntimeError("Missing text run in employee access matrix")
                cell_runs[0].text = replacement
                for run in cell_runs[1:]:
                    run.text = ""
    if not row_update_found:
        raise RuntimeError("Employee access matrix row not found")

    tables = root.findall(f".//{{{W}}}tbl")
    table_updates = {
        ("Caso", "Precondición", "Resultado esperado", "Estado"): [
            ("T-10 Configuración", "Cuenta Administrador y cuenta de otro rol.", "Solo Administrador gestiona cuentas; se registra el cambio y se revocan sesiones cuando corresponde.", "Pendiente."),
            ("T-11 Auditoría", "Cuentas Administrador, Auditor y Gestor.", "Administrador y Auditor consultan; otros roles no acceden; ningún rol modifica o elimina eventos.", "Pendiente."),
            ("T-12 Historial propio", "Dos cuentas Empleado vinculadas a fichas diferentes.", "Cada cuenta recibe solo la asistencia e incidencias de su ficha en /api/mi-historial/.", "Pendiente."),
            ("T-13 Vínculo activo", "Cuenta Empleado sin ficha o vinculada a una ficha inactiva.", "El inicio de sesión o el acceso al historial se rechaza según el estado de la ficha.", "Pendiente."),
            ("T-14 Revocación", "Cuenta con sesión previa y token de renovación vigente.", "Cambiar contraseña, rol o estado revoca la renovación de sesión anterior.", "Pendiente."),
        ],
        ("Verbo HTTP", "Ruta", "Propósito"): [
            ("GET", "/api/auditoria/", "Consulta filtrada de eventos; solo Administrador y Auditor / Dirección."),
            ("GET, POST, PATCH", "/api/configuracion/usuarios/ y /api/configuracion/usuarios/{id}/", "Lista, crea y modifica cuentas; solo Administrador."),
            ("GET", "/api/configuracion/roles/ y /api/configuracion/personas/", "Consulta roles disponibles y fichas activas para vincular; solo Administrador."),
            ("GET", "/api/mi-historial/", "Consulta asistencia e incidencias propias de la ficha vinculada."),
        ],
    }
    inserted_headers = set()
    for table in tables:
        rows = table.findall(f"{{{W}}}tr")
        if not rows:
            continue
        header = tuple(
            " ".join(
                " ".join(text.text or "" for text in cell.findall(f".//{{{W}}}t")).split()
            )
            for cell in rows[0].findall(f"{{{W}}}tc")
        )
        additions = table_updates.get(header)
        if not additions:
            continue
        if header in inserted_headers:
            continue
        inserted_headers.add(header)
        if header == ("Verbo HTTP", "Ruta", "Propósito"):
            row_properties = rows[0].find(f"{{{W}}}trPr")
            if row_properties is None:
                row_properties = etree.SubElement(rows[0], f"{{{W}}}trPr")
            if row_properties.find(f"{{{W}}}tblHeader") is None:
                etree.SubElement(row_properties, f"{{{W}}}tblHeader")
        template = rows[-1]
        for values in additions:
            new_row = deepcopy(template)
            cells = new_row.findall(f"{{{W}}}tc")
            for index, value in enumerate(values):
                cell_runs = cells[index].findall(f".//{{{W}}}t")
                if not cell_runs:
                    raise RuntimeError(f"Missing text run in table row for {header}")
                cell_runs[0].text = value
                for run in cell_runs[1:]:
                    run.text = ""
            table.append(new_row)
    if inserted_headers != set(table_updates):
        raise RuntimeError(f"Required appendix tables not found: {set(table_updates)-inserted_headers}")
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def main():
    temp = DEST.with_name(DEST.stem + ".tmp.docx")
    try:
        with ZipFile(SOURCE, "r") as zin, ZipFile(temp, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename in REPLACEMENTS:
                    data = REPLACEMENTS[item.filename].read_bytes()
                elif item.filename == "word/document.xml":
                    data = update_captions(data)
                zout.writestr(item, data)
        temp.replace(DEST)
    except Exception:
        temp.unlink(missing_ok=True)
        raise
    print(DEST)


if __name__ == "__main__":
    main()
