# Despliegue gratuito del SGA en Render y Neon

El archivo `render.yaml` crea dos servicios web gratuitos: la API Django y la
interfaz Next.js. La interfaz envía `/api/`, `/admin/` y `/static/` a la API desde
el servidor para conservar un único origen en el navegador y mantener las
cookies de sesión protegidas. PostgreSQL se aloja en Neon.

## Estado de la publicación (22 de octubre de 2026)

- Interfaz: https://sga-cal-miranda-web.onrender.com/login
- Swagger UI: https://sga-cal-miranda-web.onrender.com/api/docs/
- Esquema OpenAPI: https://sga-cal-miranda-web.onrender.com/api/schema/
- La interfaz, el endpoint CSRF y el esquema devolvieron HTTP 200 desde la
  dirección pública. El administrador inicial ingresó al panel.
- El repositorio se conectó como repositorio público. Los cambios posteriores
  a los pull requests 4 y 5 se publicaron manualmente desde Render.
- Las variables `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` siguen
  guardadas en Render por decisión del responsable de la cuenta. No publicarlas.

## Preparación

1. Crear un proyecto **Free** en Neon, de preferencia en una región cercana a
   Virginia. Copiar la cadena de conexión **directa** de PostgreSQL; incluye
   usuario, contraseña, host y base de datos. No incorporarla al repositorio.
2. En Render, conectar `CalMiranda/SGA` y crear un **Blueprint** desde la rama
   `main`. El archivo `render.yaml` debe aparecer en la vista previa con dos
   servicios de plan `free`: `sga-cal-miranda-api` y `sga-cal-miranda-web`.
3. Cuando Render solicite valores privados, introducir la cadena de Neon en
   `DATABASE_URL` y elegir `BOOTSTRAP_ADMIN_USERNAME` y una contraseña fuerte
   para `BOOTSTRAP_ADMIN_PASSWORD`. Render genera `DJANGO_SECRET_KEY`.
4. Confirmar que ambos servicios queden publicados. La interfaz prevista es
   `https://sga-cal-miranda-web.onrender.com` y el esquema de la API estará en
   `https://sga-cal-miranda-api.onrender.com/api/schema/`.
5. Entrar con el administrador inicial y retirar de Render las variables
   `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD`. La cuenta queda
   guardada en Neon; los arranques posteriores no necesitan esas variables.

## Límites y cuidado de los datos

- Los dos servicios comparten las **750 horas de instancia gratuitas por mes**
  del espacio de trabajo. Render suspende cada servicio tras 15 minutos sin
  tráfico y el primer acceso puede tardar cerca de un minuto por servicio.
- El plan Free de Neon ofrece 1 GB de almacenamiento por proyecto. Vigilar el
  uso de Neon y las horas de Render antes de la defensa.
- El almacenamiento local de los servicios Render es temporal. La información
  operativa permanece en Neon; se debe exportar una copia de seguridad de la
  base de datos antes de cambios importantes.
- La base gratuita de Render expira a los 30 días. Por eso este despliegue usa
  Neon y nunca define un recurso `databases:` en `render.yaml`.
- Los nombres `sga-cal-miranda-api` y `sga-cal-miranda-web` deben mantenerse.
  Si Render exige cambiarlos, actualizar las URL y los hosts del Blueprint
  antes de publicar.

Este plan sirve para la demostración y evaluación académica. La disponibilidad
continua y las garantías operativas del plan Free son limitadas.
