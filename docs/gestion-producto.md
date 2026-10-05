# Gestión de producto del SGA — fase 2

**Responsable del producto:** Axel Valle (Product Owner).

Este documento traduce la retroalimentación de la fase 1 en decisiones de
producto verificables. Las prioridades son una propuesta para acordar con el
equipo y el usuario piloto; no indican que las funciones estén terminadas.

## Objetivo y alcance

**Objetivo general.** Desarrollar un sistema web que centralice el registro,
consulta y seguimiento de la asistencia de empleados o estudiantes, para
facilitar la administración y la generación de reportes.

**Objetivos específicos:**

1. Modelar los procesos, el contenido y la navegación de la asistencia con UWE.
2. Implementar una API REST y una interfaz para administrar personas, horarios
   y registros de asistencia con datos persistentes.
3. Validar con un usuario piloto los flujos prioritarios y ajustar el backlog
   a partir de observaciones documentadas.
4. Definir reportes de presencia, tardanza y ausencia que puedan contrastarse
   con los registros originales.

**Estado observado en el repositorio:** la aplicación ya permite registrar y
listar personas mediante Next.js y Django REST Framework. El backend ofrece un
CRUD de personas. Hay un listado provisional de asistencia por consola con
datos fijos; no está integrado a la API ni guarda registros en PostgreSQL.
Autenticación, horarios, incidencias y reportes aún requieren implementación.

## Backlog priorizado

| ID | Prioridad | Historia de usuario | Criterio de aceptación principal | Estado |
| --- | --- | --- | --- | --- |
| SGA-01 | P0 | Como administrador, quiero registrar y consultar personas para preparar el padrón. | El código es único; nombres y apellidos son obligatorios; la lista muestra el estado activo. | Base funcional; validar con usuario. |
| SGA-02 | P0 | Como usuario autorizado, quiero iniciar sesión para acceder solo a mis funciones. | Las rutas protegidas rechazan usuarios sin sesión y permiten cerrar sesión. | Pendiente. |
| SGA-03 | P0 | Como administrador, quiero definir horarios para saber cuándo se espera una asistencia. | Cada horario tiene un período y una población asignada; se rechazan datos incompletos. | Pendiente. |
| SGA-04 | P0 | Como operador, quiero registrar presencia, tardanza o ausencia para cada persona y jornada. | Cada registro queda asociado a una persona, fecha y horario; no se crean duplicados para la misma jornada; se puede consultar el resultado guardado. | Prototipo por consola; integración pendiente. |
| SGA-05 | P0 | Como usuario del sistema, quiero recorrer Login, Dashboard y Registro de Asistencia sin rutas confusas. | Los wireframes y el mapa de navegación permiten completar el flujo principal y muestran los estados de error y vacío. | Pendiente. |
| SGA-06 | P0 | Como equipo, queremos modelos UWE para mantener trazabilidad entre requisitos y solución. | Se entregan casos de uso de procesos y navegación, modelo de contenido y mapa de navegación con estereotipos UWE; cada modelo referencia las historias pertinentes. | Pendiente. |
| SGA-07 | P1 | Como operador, quiero registrar una incidencia para explicar una ausencia o tardanza. | La incidencia queda vinculada a una asistencia, con motivo y fecha visibles al consultarla. | Pendiente. |
| SGA-08 | P1 | Como administrador, quiero consultar un reporte por período para revisar tendencias. | Los totales de presente, tarde y ausente coinciden con los registros filtrados por fechas. | Pendiente. |

**Orden propuesto:** validar SGA-01 con el piloto; acordar roles y horarios
antes de cerrar SGA-02 y SGA-03; completar los modelos y prototipos de SGA-05
y SGA-06 antes de implementar el flujo definitivo de SGA-04. Las incidencias y
reportes se construyen sobre registros de asistencia persistentes.

## Validación con usuario piloto

El Product Owner coordina una sesión con una persona que realmente registraría
o supervisaría asistencia. No se debe afirmar que la validación ocurrió hasta
tener fecha, consentimiento y hallazgos registrados.

| Tarea propuesta | Qué observar | Evidencia a registrar |
| --- | --- | --- |
| Registrar una persona y detectar un código repetido. | Comprensión de los campos y del mensaje de error. | Pasos completados, dudas y errores encontrados. |
| Consultar el padrón y reconocer quién está activo. | Claridad del listado y del estado. | Tiempo aproximado y comentarios del usuario. |
| Recorrer el prototipo de registro de asistencia. | Si entiende horario, fecha y opciones presente/tarde/ausente. | Puntos de confusión y cambios solicitados. |

Después de la sesión, anotar los hallazgos sin datos personales innecesarios,
clasificarlos por impacto, vincularlos con una historia y acordar con el equipo
qué se corrige en el siguiente sprint. Si no se consigue piloto, el riesgo de
falta de participación sigue abierto y debe informarse como tal.

## Criterio de cierre y responsabilidad ambiental

Una historia se considera terminada cuando cumple sus criterios de aceptación,
tiene comprobación funcional, documentación de los flujos afectados y revisión
del Product Owner. Un prototipo o un diagrama por sí solos no acreditan una
función implementada.

El registro digital busca reducir hojas y transcripciones manuales. Para evitar
consumo innecesario de infraestructura, el equipo revisará consultas y
almacenamiento, y utilizará recursos compartidos o cloud cuando sea viable.
Estas ventajas son objetivos de diseño; no se declaran ahorros de papel o
energía sin mediciones.
