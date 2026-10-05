# Sistema de Gestión de Asistencia (SGA)

Aplicación para registrar y consultar personas mediante una API REST de Django
y una interfaz de Next.js. El módulo actual permite administrar el código,
nombres, apellidos y estado activo de cada persona.

## Estructura

- `backend/`: API con Django REST Framework y base de datos PostgreSQL.
- `frontend/`: interfaz con Next.js, React y TypeScript.

## Requisitos

- Python y `pip` compatibles con las versiones de `backend/requirements.txt`.
- Node.js y npm compatibles con las versiones de `frontend/package.json`.
- PostgreSQL con una base de datos y un usuario creados para el proyecto.

## Configurar el backend

Desde la raíz del proyecto, en PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Crea `backend/.env` con los datos de tu instancia de PostgreSQL:

```dotenv
DB_NAME=sga
DB_USER=sga_user
DB_PASSWORD=reemplaza_con_tu_clave_local
DB_HOST=127.0.0.1
DB_PORT=5432
```

La base de datos y el usuario deben existir antes de aplicar las migraciones.
El archivo `.env` está excluido de Git.

Desde `backend/`, aplica las migraciones e inicia la API:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

## Configurar el frontend

En otra terminal, desde la raíz del proyecto:

```powershell
cd frontend
npm ci
```

Crea `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Usa la URL base sin `/api` y sin una barra final: el frontend agrega
`/api/personas/` a las solicitudes. Esta variable es pública y no debe contener
credenciales. Reinicia el servidor de Next.js si cambias su valor.

```powershell
npm run dev
```

Abre <http://localhost:3000> y mantén ambas terminales en ejecución.

## Rutas disponibles

| Ruta | Función |
| --- | --- |
| `http://127.0.0.1:8000/api/personas/` | Listado y registro de personas. |
| `http://127.0.0.1:8000/api/personas/{id}/` | Consulta, actualización y eliminación de una persona. |
| `http://127.0.0.1:8000/api/docs/` | Documentación interactiva de la API. |
| `http://127.0.0.1:8000/api/schema/` | Esquema OpenAPI. |
| `http://127.0.0.1:8000/admin/` | Administración de Django; requiere un superusuario. |

## Comprobaciones locales

Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py check
```

Desde `frontend/`:

```powershell
npm run lint
npm run build
```

La configuración actual del backend está preparada para desarrollo local.

## Planificación del producto

El [backlog de la fase 2](docs/gestion-producto.md) recoge las prioridades,
criterios de aceptación y la validación pendiente con un usuario piloto.
