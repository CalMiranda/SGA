# Frontend de SGA

Interfaz de Next.js para consultar personas registradas y agregar nuevos
registros al Sistema de Gestión de Asistencia.

## Desarrollo local

Instala las dependencias desde esta carpeta:

```powershell
npm ci
```

Crea un archivo `.env.local` con la URL base del backend:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

La URL debe ir sin `/api` y sin una barra final. La aplicación agrega
`/api/personas/` al consultar o registrar personas. Esta variable es pública;
no incluyas credenciales en ella.

Con el backend en ejecución, inicia la interfaz:

```powershell
npm run dev
```

Abre <http://localhost:3000>. Reinicia el servidor de desarrollo si cambias
`.env.local`.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run build` | Genera la compilación de producción. |
| `npm start` | Inicia la compilación de producción después de `npm run build`. |

La configuración de PostgreSQL, las migraciones y las rutas de la API están
documentadas en el [README principal](../README.md).
