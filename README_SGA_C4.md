# Arquitectura del Sistema de Gestión de Asistencia

La arquitectura del repositorio separa interfaz, servicio web y persistencia.
Incluye módulos operativos, configuración de cuentas, auditoría y consulta
personal con permisos aplicados en la API. La validación con usuarios piloto y el
alojamiento público siguen pendientes.

## C4 nivel 1: contexto

```mermaid
C4Context
title SGA - Contexto del sistema
Person(admin, "Administrador", "Gestiona cuentas, permisos y datos del sistema")
Person(gestor, "Gestor de asistencia", "Registra personas, horarios e incidencias")
Person(persona, "Empleado o estudiante", "Consulta su historial personal de asistencia")
Person(direccion, "Dirección o auditoría", "Consulta indicadores y la bitácora de cambios")
System(sga, "Sistema de Gestión de Asistencia", "Gestiona asistencia y ofrece consultas según el rol")
Rel(admin, sga, "Administra y consulta")
Rel(gestor, sga, "Registra y consulta")
Rel(persona, sga, "Consulta su historial vinculado")
Rel(direccion, sga, "Consulta reportes y auditoría")
```

## C4 nivel 2: contenedores

```mermaid
C4Container
title SGA - Contenedores
Person(user, "Usuario autorizado")
System_Boundary(sga, "Sistema de Gestión de Asistencia") {
  Container(web, "Aplicación web", "Next.js / React / TypeScript", "Interfaz y consumo de la API")
  Container(api, "API REST", "Django REST Framework", "Autenticación, validaciones y reglas de negocio")
  ContainerDb(db, "Base de datos", "PostgreSQL", "Usuarios, personas, horarios, asistencias, incidencias y auditoría")
}
Rel(user, web, "Usa", "HTTPS")
Rel(web, api, "Solicita recursos", "HTTPS / JSON / cookies JWT")
Rel(api, db, "Lee y persiste datos", "Django ORM")
```

## Inicio de sesión y consulta protegida

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant W as Next.js
  participant A as API Django REST
  participant DB as PostgreSQL
  U->>W: Ingresa usuario y contraseña
  W->>A: GET /api/auth/csrf/
  A-->>W: Token CSRF y cookie CSRF
  W->>A: POST /api/auth/login/ + X-CSRFToken
  A->>DB: Valida credenciales
  alt Credenciales inválidas
    A-->>W: 401 genérico
    W-->>U: Muestra error de acceso
  else Credenciales válidas
    alt Cuenta con rol habilitado
    A-->>W: Cookies JWT HttpOnly + usuario
    W->>A: GET /api/auth/me/ con cookie de acceso
    A-->>W: 200 + usuario
    W-->>U: Muestra el área autenticada
    else Sin grupo autorizado
      A-->>W: 403 acceso no autorizado
      W-->>U: Solicita habilitación al administrador
    end
  end
```

## Renovación de sesión

```mermaid
sequenceDiagram
  actor U as Usuario
  participant W as Next.js
  participant A as API Django REST
  W->>A: Solicitud protegida con access token
  A-->>W: 401 si el access token venció
  W->>A: POST /api/auth/refresh/ + X-CSRFToken
  A-->>W: Access token nuevo y refresh rotado
  W->>A: Repite la solicitud original
  A-->>W: Recurso autorizado o 401 al expirar la sesión
```

## Endpoints de datos

| Recurso | Endpoint base | Verbos | Modelo principal |
| --- | --- | --- | --- |
| Personas | `/api/personas/` | GET, POST, PUT, PATCH, DELETE | `Persona` |
| Horarios | `/api/horarios/` | GET, POST, PUT, PATCH, DELETE | `Horario` |
| Asistencias | `/api/asistencias/` | GET, POST, PUT, PATCH, DELETE | `RegistroAsistencia` |
| Incidencias | `/api/incidencias/` | GET, POST, PUT, PATCH, DELETE | `Incidencia` |
| Justificaciones | `/api/justificaciones/` | GET, POST, PUT, PATCH, DELETE | `Justificacion` |
| Bitácora de auditoría | `/api/auditoria/` | GET | `AuditEvent` |
| Cuentas | `/api/configuracion/usuarios/` | GET, POST, PATCH | `auth.User` + `Group` |
| Roles y fichas para configuración | `/api/configuracion/roles/`, `/api/configuracion/personas/` | GET | `Group`, `Persona` |
| Historial personal | `/api/mi-historial/` | GET | Asistencias de la ficha vinculada |

Los endpoints de negocio requieren autenticación. Las operaciones que modifican
datos requieren una cabecera CSRF válida. El esquema OpenAPI y Swagger están
disponibles en `/api/schema/` y `/api/docs/`.

El servidor autoriza `Administrador` y `Gestor de asistencia` para leer y
modificar los recursos operativos, y `Supervisor / Docente` y `Auditor / Dirección`
para lectura. Auditoría se limita a `Administrador` y `Auditor / Dirección`;
Configuración se limita a `Administrador`; Empleado / Estudiante consulta solo su
historial mediante la ficha Persona vinculada. No hay filtrado por sede o área.
