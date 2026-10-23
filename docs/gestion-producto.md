# Gestión del producto del SGA

**Product Owner:** Axel Ivan Valle Obando  
**Scrum Master:** Milton Joan Bell Calderón  
**Desarrollo, calidad y documentación:** Caleb Francisco Miranda Centeno, con
participación de todo el equipo.

## Objetivo del producto

Desarrollar un sistema web que centralice el registro, la consulta y el
seguimiento de la asistencia de empleados o estudiantes, para facilitar la
administración y la preparación de reportes.

## Alcance previsto

La propuesta incluye autenticación y usuarios, gestión de personas, horarios,
registro de asistencia, incidencias, justificaciones, reportes, indicadores y
auditoría. Los diagramas UWE describen este alcance objetivo. La tabla siguiente
separa las capacidades que ya aparecen en el código de las que todavía requieren
desarrollo o validación.

## Backlog y estado observado

| ID | Prioridad | Historia | Criterio principal | Estado en el repositorio |
| --- | --- | --- | --- | --- |
| SGA-01 | P0 | Como administrador, quiero registrar y consultar personas para mantener el padrón. | Código único, campos obligatorios, estado activo e inactivo. | Implementado en interfaz y API REST. |
| SGA-02 | P0 | Como usuario autorizado, quiero iniciar y cerrar sesión de forma segura. | Las rutas y recursos protegidos rechazan usuarios anónimos; se permite renovar y revocar sesión. | Implementado con JWT en cookies HttpOnly, CSRF, renovación, revocación y grupos de rol; requiere validación funcional. |
| SGA-03 | P0 | Como administrador, quiero definir horarios para establecer los períodos de asistencia. | Nombre único, hora de entrada posterior a hora de salida validada y tolerancia no negativa. | Implementado en interfaz y API REST; no existe asignación de personas o grupos. |
| SGA-04 | P0 | Como gestor, quiero registrar presencia, tardanza, ausencia o justificación. | Cada registro relaciona persona, horario, fecha y estado; se impiden duplicados por jornada. | Implementado en interfaz, API y modelo relacional. |
| SGA-05 | P0 | Como usuario, quiero completar el flujo de navegación del sistema. | Login, Dashboard y módulos deben permitir comprender el recorrido y mostrar estados vacíos y errores. | Login, Dashboard, Personas, Horarios, Asistencia, Incidencias, Reportes, Auditoría, Configuración y Mi historial tienen rutas web según el rol. |
| SGA-06 | P0 | Como equipo, queremos mantener trazabilidad entre requisitos y diseño. | Se presentan casos de uso de procesos y navegación, contenido y mapa de navegación con notación UWE. | Diagramas UWE editables y exportados incorporados al expediente del proyecto. |
| SGA-07 | P1 | Como gestor, quiero documentar incidencias y justificaciones. | La incidencia se vincula con una asistencia y su justificación puede revisarse. | Incidencias y justificaciones implementadas en interfaz, API y modelos. |
| SGA-08 | P1 | Como administrador, quiero analizar resultados por período y revisar acciones. | Los reportes se calculan sobre datos persistidos y la auditoría registra cambios. | Reportes, bitácora de auditoría y exportación CSV implementados. La aceptación con usuarios piloto sigue pendiente. |
| SGA-09 | P1 | Como administrador, quiero crear y mantener cuentas con roles institucionales. | Contraseñas validadas, vinculación individual para Empleado / Estudiante y revocación de sesiones ante cambios de seguridad. | Configuración de cuentas y roles implementada en `/configuracion`, con acceso restringido a Administración. |
| SGA-10 | P1 | Como empleado o estudiante, quiero consultar mi historial. | La API entrega únicamente las asistencias de la persona vinculada a mi cuenta. | Módulo `/mi-historial` implementado con filtros por período y estado, incidencias y exportación CSV personal. |

## Criterios de seguridad

- No se permite acceso anónimo a los endpoints de negocio.
- La aplicación no tiene registro público de cuentas; la administración crea los
  usuarios institucionales.
- Los JWT se mantienen en cookies `HttpOnly`; las escrituras requieren token
  CSRF y se limitan intentos de inicio de sesión.
- Administrador y Gestor de asistencia pueden leer y modificar los módulos operativos. Supervisor / Docente y Auditor / Dirección tienen acceso operativo de solo lectura. Administración gestiona cuentas; Administración y Auditor / Dirección consultan la bitácora.
- Los grupos se generan al migrar la base de datos y el administrador asigna a cada
  usuario su grupo. Las cuentas sin uno de esos roles no inician sesión.
- El perfil Empleado / Estudiante se vincula a una ficha Persona activa y la API permite consultar únicamente las asistencias de esa ficha.
- La bitácora registra actor, entidad, acción, fecha y nombres de campos modificados. No almacena contraseñas ni valores anteriores.
- La autorización todavía no filtra por sede, área o grupo. La seguridad y la aceptación deben validarse con usuarios piloto antes del despliegue público.

## Validación con usuario piloto

La UNI se utiliza como institución de referencia académica del proyecto. La
selección de una unidad operativa como piloto y la designación de su persona de
contacto siguen pendientes. El Product Owner debe coordinar una sesión con un operador real y registrar la fecha,
las tareas realizadas, los errores observados y las mejoras acordadas. Hasta que
se disponga de ese registro, la validación de aceptación y usabilidad se considera
pendiente.

| Tarea | Qué observar | Evidencia |
| --- | --- | --- |
| Iniciar sesión y llegar al módulo correspondiente al rol. | Comprensión de los campos, mensajes, restricciones y cierre de sesión. | Resultado, dudas y tiempo aproximado. |
| Registrar una persona y repetir su código. | Comprensión de campos y validación de duplicados. | Pasos completados y errores. |
| Crear un horario y registrar asistencia. | Claridad de la fecha, horario, estado y mensajes. | Resultado y observaciones del operador. |
| Registrar una incidencia y revisar una justificación. | Comprensión del vínculo con la asistencia. | Dudas, errores y cambios solicitados. |

## Despliegue y responsabilidad ambiental

La configuración de Docker Compose conserva un entorno local con Next.js,
Django, PostgreSQL y Caddy. La publicación académica está activa en Render
(https://sga-cal-miranda-web.onrender.com/login) con dos servicios Docker
gratuitos y PostgreSQL administrado en Neon. Render proporciona HTTPS. No hay
mediciones de consumo ni resultados de un piloto institucional para afirmar
ahorros cuantificados.

La solución digital puede reducir la dependencia de listas impresas y
transcripciones. En el hosting se debe priorizar un servicio compartido y
dimensionado al uso previsto, mantener solo los datos necesarios y respaldar la
base de datos con una política definida. Los ahorros de papel o energía deben
medirse antes de expresarse como resultados.
