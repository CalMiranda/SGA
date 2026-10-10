# Sistema de Gestión de Asistencia (SGA)

## Arquitectura

La arquitectura se documenta con el Modelo C4 y diagramas de secuencia bajo un enfoque API-First.

### C4 Nivel 1 - Contexto

```mermaid
C4Context
title SGA - Contexto del sistema
Person(admin, "Administrador", "Gestiona usuarios, roles y catálogos")
Person(responsable, "Responsable de área", "Gestiona horarios, incidencias y reportes")
Person(usuario, "Usuario registrado", "Consulta y registra asistencia según permisos")
System(sga, "Sistema de Gestión de Asistencia", "Centraliza horarios, asistencias, incidencias y reportes")
System_Ext(email, "Correo institucional", "Servicio externo de notificaciones")
Rel(admin, sga, "Administra configuración")
Rel(responsable, sga, "Gestiona asistencia")
Rel(usuario, sga, "Consulta y registra información")
Rel(sga, email, "Envía notificaciones", "SMTP/API")
```

### C4 Nivel 2 - Contenedores

```mermaid
C4Container
title SGA - Contenedores
Person(usuario, "Usuarios del SGA")
System_Boundary(sga, "Sistema de Gestión de Asistencia") {
  Container(web, "Aplicación Web", "React / JavaScript", "Interfaz de usuario y consumo de API")
  Container(api, "API REST", "ASP.NET Core Web API / C#", "Autenticación, reglas de negocio y endpoints HTTP")
  ContainerDb(db, "Base de Datos", "SQL Server", "Usuarios, horarios, asistencias y estados")
  Container(notify, "Servicio de Notificaciones", "C# / SMTP", "Mensajes y avisos")
}
System_Ext(email, "Correo institucional", "Proveedor de correo")
Rel(usuario, web, "Usa", "HTTPS")
Rel(web, api, "Consume API REST", "HTTPS/JSON")
Rel(api, db, "Lee y escribe", "EF Core / SQL")
Rel(api, notify, "Solicita notificación")
Rel(notify, email, "Envía", "SMTP/API")
```

### Secuencia 1 - Login y consulta de asistencia

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant W as Aplicación Web
  participant A as API REST
  participant DB as SQL Server
  U->>W: Ingresa correo y contraseña
  W->>A: POST /api/auth/login
  A->>DB: Buscar usuario y hash
  DB-->>A: Datos del usuario
  alt Credenciales válidas
    A-->>W: 200 OK + token
    W->>A: GET /api/attendance/mine
    A->>DB: Consultar asistencias
    DB-->>A: Lista de registros
    A-->>W: 200 OK + JSON
    W-->>U: Mostrar asistencia
  else Credenciales inválidas
    A-->>W: 401 Unauthorized
    W-->>U: Mostrar error de autenticación
  end
```

### Secuencia 2 - Registro de asistencia

```mermaid
sequenceDiagram
  autonumber
  actor R as Responsable
  participant W as Aplicación Web
  participant A as API REST
  participant DB as SQL Server
  R->>W: Completa registro de asistencia
  W->>A: POST /api/attendance
  A->>A: Validar DTO y permisos
  A->>DB: Comprobar duplicidad
  DB-->>A: Resultado
  alt Registro válido
    A->>DB: INSERT asistencia
    DB-->>A: Registro creado
    A-->>W: 201 Created + recurso
    W-->>R: Mostrar confirmación
  else Registro incompatible
    A-->>W: 409 Conflict
    W-->>R: Mostrar conflicto
  end
```

## API principal

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Autenticar usuario |
| GET | `/api/attendance/mine` | Consultar asistencia del usuario |
| POST | `/api/attendance` | Crear registro de asistencia |
| PATCH | `/api/attendance/{id}/classification` | Clasificar o corregir incidencia |
| GET | `/api/reports/attendance` | Consultar reporte de asistencia |
