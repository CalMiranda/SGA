# Sistema de Gestión de Asistencia

Aplicación web para centralizar la gestión de personas, horarios, asistencias,
incidencias y justificaciones. El frontend Next.js consume una API REST de
Django REST Framework; PostgreSQL guarda la información.

## Estructura

- `frontend/`: interfaz Next.js y TypeScript.
- `backend/`: API Django REST Framework, autenticación JWT y modelos de dominio.
- `docs/`: documentos técnicos y seguimiento del producto.
- `docker-compose.yml`: despliegue de frontend, API, PostgreSQL y proxy HTTPS.

## Desarrollo local

Se necesita Python compatible con `backend/requirements.txt`, Node.js compatible
con `frontend/package.json` y PostgreSQL.

### Backend

En PowerShell, desde la raíz del proyecto:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env` con la base de datos local y establece una contraseña para
PostgreSQL. Luego, desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

La API queda disponible en `http://localhost:8000/`.

### Opción rápida con Docker

Para levantar frontend, API y PostgreSQL localmente sin dominio ni hosting:

```sh
docker compose -f docker-compose.local.yml up --build -d
docker compose -f docker-compose.local.yml exec backend python manage.py createsuperuser
```

Abre `http://localhost:3000/` e inicia sesión con el usuario administrador
creado. El PostgreSQL local conserva sus datos en el volumen
`sga_local_database`; los puertos de la aplicación solo se publican en el equipo
local. Las credenciales incluidas en esta configuración son exclusivamente para
desarrollo y no deben usarse en un servidor accesible por Internet.

### Frontend

En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000/`. La aplicación solicita iniciar sesión y redirige
a esa pantalla si no existe una sesión válida. Los datos de acceso son los del
usuario Django creado con `createsuperuser`. Las cuentas institucionales se crean
y asignan a roles desde Configuración con una cuenta Administrador.

## Autenticación y seguridad

- JWT de acceso y renovación en cookies `HttpOnly`, `SameSite=Lax`; en producción
  se añade `Secure` y HTTPS.
- Access token con vida de 10 minutos y refresh token de un día, con rotación y
  lista de revocación.
- CSRF para login y solicitudes que modifican datos; el frontend manda el token
  CSRF en la cabecera `X-CSRFToken`.
- Todos los recursos de negocio de la API requieren usuario autenticado.
- Los grupos `Administrador` y `Gestor de asistencia` pueden consultar y modificar
  los recursos de negocio. `Supervisor / Docente` y `Auditor / Dirección` tienen
  acceso de solo lectura. El superusuario conserva acceso administrativo.
- Administración puede mantener cuentas y roles desde `/configuracion`. Los
  cambios de contraseña, rol o estado revocan los refresh tokens existentes.
- Administración y Auditor / Dirección pueden consultar `/auditoria`. La bitácora
  registra actor, acción y nombres de campos modificados; no almacena contraseñas
  ni valores anteriores.
- La ficha de persona almacena su correo institucional, rol de referencia y
  grupo o área. El rol institucional sirve para filtrar reportes; los permisos de
  inicio de sesión y edición siguen controlados por los grupos de Django.
- Cada horario almacena su tipo (laboral o académico), días aplicables, grupo o
  área y estado activo, además de entrada, salida y tolerancia.
- Los grupos se crean automáticamente al aplicar migraciones. Las cuentas sin rol
  habilitado no pueden iniciar sesión en el SGA.
- El perfil `Empleado / Estudiante` se vincula a una ficha Persona activa. Su ruta
  `/mi-historial` y su endpoint solo consultan las asistencias de esa ficha; la API
  rechaza el acceso a los recursos operativos.
- El login limita los intentos por IP; el backend aplica límites generales.
- La llave de Django, credenciales de base de datos, hosts y orígenes permitidos
  se configuran en variables de entorno.
- El Dockerfile del backend ejecuta Gunicorn con un usuario sin privilegios; los
  contextos Docker excluyen archivos `.env` y dependencias locales. Compose incluye
  comprobaciones de salud para la API y el frontend.
- No hay registro público de cuentas. La gestión de contraseñas y altas de
  usuarios corresponde a un administrador.

Los permisos se aplican en el servidor. El sistema todavía no incluye catálogos
institucionales para administrar sedes o áreas; el área se guarda como dato de
texto de la ficha.

## API

| Métodos HTTP | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Obtiene el token CSRF para el navegador. |
| POST | `/api/auth/login/` | Inicia sesión con usuario y contraseña. |
| POST | `/api/auth/refresh/` | Renueva la sesión con la cookie de refresh. |
| POST | `/api/auth/logout/` | Revoca el refresh token y cierra sesión. |
| GET | `/api/auth/me/` | Consulta el usuario autenticado. |
| GET, POST, PUT, PATCH, DELETE | `/api/personas/` y `/api/personas/{id}/` | Gestiona personas. |
| GET, POST, PUT, PATCH, DELETE | `/api/horarios/` y `/api/horarios/{id}/` | Gestiona horarios. |
| GET, POST, PUT, PATCH, DELETE | `/api/asistencias/` y `/api/asistencias/{id}/` | Registra y consulta asistencia. |
| GET, POST, PUT, PATCH, DELETE | `/api/incidencias/` y `/api/incidencias/{id}/` | Gestiona incidencias. |
| GET, POST, PUT, PATCH, DELETE | `/api/justificaciones/` y `/api/justificaciones/{id}/` | Gestiona justificaciones. |
| GET | `/api/auditoria/` | Consulta la bitácora con filtros por actor, acción, entidad y fechas. |
| GET, POST, PATCH | `/api/configuracion/usuarios/` y `/api/configuracion/usuarios/{id}/` | Administra cuentas sin exponer contraseñas. Solo Administración. |
| GET | `/api/configuracion/roles/` y `/api/configuracion/personas/` | Obtiene roles y fichas para configurar cuentas. Solo Administración. |
| GET | `/api/mi-historial/` | Consulta la asistencia de la ficha vinculada a la sesión. Solo Empleado / Estudiante. |
| GET | `/api/schema/` | Esquema OpenAPI. |
| GET | `/api/docs/` | Documentación Swagger. |

Las rutas CRUD requieren cookies de autenticación y las solicitudes de escritura
requieren además la cabecera CSRF. Las rutas de inicio, renovación y cierre de
sesión aceptan solicitudes anónimas según su función.

## Despliegue con Docker

El despliegue preparado utiliza Docker Compose, PostgreSQL, Caddy y HTTPS
automático. Requiere un servidor con Docker y un dominio cuyo DNS apunte al
servidor. Copia el archivo `.env.example` como `.env`, cambia todos los secretos
y contraseñas, configura el dominio y `PUBLIC_ORIGIN`, y luego ejecuta:

```sh
docker compose up --build -d
```

El primer arranque aplica migraciones. Crea el usuario administrador dentro del
contenedor de la API:

```sh
docker compose exec backend python manage.py createsuperuser
```

El host de producción debe habilitar respaldos de PostgreSQL, actualizaciones de
contenedores, acceso SSH protegido y firewall para exponer solo los puertos 80 y
443. No se deben usar los valores de `.env.example` en un despliegue real.

## Documentación de apoyo

- [Arquitectura C4 y flujos](README_SGA_C4.md)
- [Seguimiento del producto](docs/gestion-producto.md)
- Repositorio indicado en el manual de la Fase 2: <https://github.com/CalMiranda/SGA.git>
