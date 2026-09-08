# Bloque 2 — Paso 1: investigación de Banexa en cPanel + preparación de tarjeta-digital

## Parte 1 — Cómo corre Banexa (bot_ia), investigado en el repo local

### Hallazgo previo importante: el repo tiene DOS narrativas de hosting distintas

Antes de nada: `bot_ia/reportes/` contiene varios diagnósticos de **finales de
julio** que hablan de **Plesk** (`Diagnostico_arquitectura_deploy_Plesk_
reporte.txt`, `Config_Plesk_app_Python_reporte.txt`, ambos "solo lectura",
fechados 2026-07-26/27). Pero también existe
`bot_ia/docs/ROSITA_runbook_deploy_31_julio.md` — un runbook operativo,
posterior, que dice explícitamente **"Hosting: cPanel con Postgres"** y da
instrucciones concretas de cPanel (Setup Python App, Passenger, Cron Jobs).
El `settings.py` REAL de la rama `produccion` de bot_ia ya tiene los
dominios de producción cableados (`api.kabymur.com`, `banexa.kabymur.com`,
`rosita.kabymur.com`, `kabymur.com`), consistente con el runbook de cPanel,
no con el diagnóstico de Plesk. Conclusión: **es cPanel**, como dice tu
contexto — el rastro de "Plesk" es de una etapa de exploración anterior que
quedó superada; no debería confundir el deploy de tarjeta-digital, pero
vale la pena que lo sepas por si aparece en otro lado.

### 1. `passenger_wsgi.py` — NO está en el repo

Confirmado con `git log --all` y `git ls-files`: nunca existió en el
historial de bot_ia, ni siquiera untracked-y-luego-borrado. Vive solo en el
servidor, exactamente como anticipaba la tarea. El runbook (sección 2.7)
documenta un **template de referencia** (no necesariamente el archivo real
que cPanel generó):

```python
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

**Necesito que confirmes esto contra el archivo real**:
```
cat ~/public_html/api.kabymur.com/backend/passenger_wsgi.py
```
(o la ruta real si "Application root" de Banexa no es exactamente esa —
dime cuál es). No se inventó nada más allá de este template documentado.

### 2. Patrón de `settings.py`: dev vs producción

Leído directo de `produccion:backend/config/settings.py` (sin hacer
checkout, con `git show`):

- `SECRET_KEY = env('SECRET_KEY')` — obligatoria, sin default.
- `DEBUG = env.bool('DEBUG', default=False)` — casteo explícito a bool
  (bot_ia corrigió esto en el commit `fdbef5d`; antes decía `env('DEBUG')`
  a secas, y aunque investigaron que en su caso el schema de `Env()` ya
  casteaba bien, lo dejaron explícito para que no dependa de eso).
- `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`: **NO
  se leen del `.env`** — están **hardcodeados como listas de Python** en
  `settings.py`, con los dominios reales agregados a mano
  (`api.kabymur.com`, `kabymur.com`, `rosita.kabymur.com`,
  `banexa.kabymur.com`). Un runbook anterior (paso 1.3) proponía hacerlos
  dinámicos vía env (`ALLOWED_HOSTS_EXTRA`/`CORS_ORIGINS_EXTRA`), pero **no
  se implementó así** — el patrón real terminó siendo editar `settings.py`
  directo cada vez que se agrega un dominio.
- `DATABASES`: `env.db()` estándar de django-environ, **más un wrapper
  propio** — `DATABASES['default']['ENGINE'] = 'config.pg_backend'`. Motivo
  documentado (`reportes/Diagnostico_PostgreSQL13_Django6_reporte.txt`):
  el Postgres del hosting es versión **13**, pero Django 6 exige 14+ por
  defecto — `config/pg_backend.py` es un backend propio que hereda del
  real de Django y sólo neutraliza ese chequeo de versión mínima.
- `STATIC_URL`/`STATIC_ROOT` (`backend/staticfiles/`) y `MEDIA_URL`/
  `MEDIA_ROOT` (`backend/media/`) configurados con Django estándar.
- **Sin whitenoise activado**: `whitenoise` está en `requirements.txt` pero
  **NO aparece en `MIDDLEWARE`** del `settings.py` real (un runbook anterior
  proponía cablearlo, pero no quedó hecho). Y en `urls.py` de bot_ia, igual
  que en tarjeta-digital, la vista `static()` de Django para `/media/` solo
  se agrega `if DEBUG` — con `DEBUG=False` en producción, **Django mismo no
  sirve ni estáticos ni media**. Conclusión: algo FUERA de Django (Apache/
  Passenger/cPanel) tiene que estar sirviendo esos archivos directamente
  desde el disco para que Banexa funcione hoy — no encontré en el repo
  ningún `.htaccess` ni configuración que lo documente (probablemente vive
  solo en la pantalla "Setup Python App" de cPanel, en la sección de
  "Static Files Mappings", que no es parte del repo).

**Necesito que confirmes**: entra a cPanel → Setup Python App → la app de
Banexa, y dime si existe una sección de "Static Files" / mapeos de
archivos estáticos, y qué URL/carpeta tiene configurada — así replico
exactamente lo mismo para tarjeta-digital en vez de adivinar.

### 3. Estructura de carpetas / cómo Passenger encuentra la app

- `manage.py` vive en `backend/manage.py` (no en la raíz del repo).
- El runbook indica: "Application root" = la carpeta de la app en cPanel
  (ej. `~/rosita`), y el repo completo se clona AHÍ (`git clone ... .`) —
  o sea `backend/` queda como subcarpeta de esa raíz.
- `passenger_wsgi.py` vive en esa raíz (un nivel arriba de `backend/`) y
  hace `sys.path.insert(0, .../backend)` para poder importar `config.wsgi`.
- "Application startup file" configurado en cPanel: `backend/config/
  wsgi.py` (aunque el `passenger_wsgi.py` manual del punto 2.7 del runbook
  hace lo mismo a mano, por si cPanel no lo arma solo).

## Parte 2 — Preparación de tarjeta-digital

### Decisión de arquitectura: mismo dominio, backend en `/api` (NO subdominio aparte)

La tarea preguntaba si conviene replicar el patrón de Banexa (backend en su
propio subdominio, `api.kabymur.com`, separado del frontend). **Revisé el
código real y la respuesta es que tarjeta-digital NO puede usar ese
patrón sin romper el login**, por una razón concreta encontrada en el
código:

- Banexa NO usa cookies entre frontend y backend — `portal_banexa/src/lib/
  api.js` guarda el JWT en `localStorage` y lo manda como header
  `Authorization: Bearer <token>`. Por eso le da igual que frontend y
  backend estén en dominios distintos.
- tarjeta-digital SÍ usa una cookie httpOnly (`apps/cuentas/banexa.py`,
  `COOKIE_TOKEN = 'banexa_token'`, `samesite='Lax'`), y **todas** las
  llamadas del frontend van con `credentials: 'include'`
  (`frontend/src/api/cliente.js`). Una cookie `SameSite=Lax` **no se manda
  en llamadas fetch/XHR cross-site** entre subdominios distintos (solo en
  navegación GET de nivel superior) — si backend y frontend quedaran en
  subdominios distintos (ej. `tarjeta.kabymur.com` +
  `api-tarjeta.kabymur.com`), el login dejaría de funcionar en producción
  aunque funcione perfecto en dev (mismo origen ahí, por eso nunca se nota
  en local).

**Estructura propuesta**: un solo dominio, `tarjeta.kabymur.com`:
- El build de React (`frontend/dist/`) se sirve como sitio estático en el
  document root del dominio.
- El backend Django se monta como app de Python de cPanel en la URL
  `tarjeta.kabymur.com/api` (no en el dominio completo) — cPanel "Setup
  Python App" permite dar una subruta como "Application URL", no solo el
  dominio entero.
- Con esto, la cookie sigue siendo estrictamente same-origin (mismo
  esquema+dominio+puerto que el frontend) — cero cambios necesarios en el
  mecanismo de login actual, y de hecho ya no haría falta CORS para nada
  real (se deja configurado de todos modos, por si acaso).

**Ojo — esto no tiene precedente ya probado en este cPanel**: la única app
Python existente (Banexa) ocupa un subdominio COMPLETO
(`api.kabymur.com`), no una subruta de otro dominio. No encontré en el
repo ninguna app montada en una subruta para confirmar que el plan de
hosting lo permite. **Necesito que lo confirmes al configurar "Setup
Python App"** para tarjeta.kabymur.com — si el panel no deja usar una
subruta y exige el dominio completo, avísame y hay que replantear (ej.
pedir un segundo subdominio y resolver el login de otra forma, un cambio
de código más grande que no toqué acá).

### Archivos preparados (no se despliega nada, quedan listos)

1. **`backend/passenger_wsgi.py.example`** (nuevo, commiteado como
   `.example` — NO como `passenger_wsgi.py` real, mismo criterio que
   Banexa de no versionarlo): plantilla basada en el template documentado
   de Banexa, ajustada a las rutas de tarjeta-digital. Pendiente de
   confirmar contra el archivo real de Banexa (ver Parte 1, punto 1).

2. **`backend/config/settings.py`**: se agregó `STATIC_ROOT = os.path.join
   (BASE_DIR, 'staticfiles')` — **faltaba por completo** (solo existía
   `STATIC_URL`), y sin él `collectstatic` no tiene dónde juntar los
   archivos. El resto del archivo ya estaba bien preparado para
   producción: `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
   `CSRF_TRUSTED_ORIGINS` y `DATABASES` ya se leen del `.env` (mejor que el
   patrón hardcodeado de Banexa, no hubo que tocar nada ahí). `manage.py
   check` sigue limpio tras el cambio.

   **Riesgo real detectado, sin resolver todavía**: `requirements.txt` no
   fija versiones (`Django` a secas, sin `==`). El venv de desarrollo tiene
   **Django 6.1.1** instalado — la MISMA familia que le exigió a Banexa el
   wrapper `pg_backend.py` porque el Postgres del hosting es versión 13.
   Si `kabymur1_tarjetas` corre en el mismo servidor Postgres 13, **`migrate`
   fallará en el primer intento** sin ese mismo workaround. No lo apliqué
   preventivamente (no confirmé que aplique) — **necesito que confirmes la
   versión de Postgres de este cPanel** antes de decidir si portamos
   `config/pg_backend.py` de bot_ia a tarjeta-digital.

3. **Servido de `/static/` y `/media/` en producción — sin resolver,
   necesita tu confirmación**: igual que en bot_ia, `backend/config/
   urls.py` solo agrega la vista `static()` de Django `if settings.DEBUG`
   — con `DEBUG=False`, Django NO va a servir `/media/` (las fotos de las
   tarjetas) ni el admin estático por sí solo. Como Banexa tampoco tiene
   whitenoise activado, algo en cPanel/Apache debe estar resolviendo esto
   hoy para Banexa — necesito que revises cómo (ver Parte 1, punto 2) para
   replicar exactamente eso, en vez de asumir que "algo" lo va a resolver
   solo. **Si esto no se resuelve antes del deploy, las fotos de perfil de
   las tarjetas van a dar 404 en producción.**

4. **`backend/.env.production.example`** (nuevo): plantilla completa, sin
   secretos, con `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=
   tarjeta.kabymur.com`, `DATABASE_URL` apuntando a `kabymur1_tarjetas`,
   `BANEXA_API_URL=https://api.kabymur.com/api`, CORS/CSRF para
   `tarjeta.kabymur.com`, `EMAIL_*` real (SMTP, comentado con qué llenar),
   `PUBLIC_BASE_URL=https://tarjeta.kabymur.com` y, **crítico**,
   `TARJETA_MODO_DEV=False`.

5. **`frontend/.env.production.example`** (nuevo): `VITE_API_BASE=
   https://tarjeta.kabymur.com/api` (mismo dominio + `/api`, coherente con
   la arquitectura propuesta), `VITE_PUBLIC_BASE_URL` y
   `VITE_GOOGLE_CLIENT_ID` (a confirmar si se reusa el de Banexa o se pide
   uno propio — es un dato público, no secreto).

## Parte 3 — Rama `produccion`

Creada desde `main` (con los cambios de esta tarea ya commiteados en
`main` primero, para no bifurcar `settings.py` en dos historias como le
pasó a bot_ia con su `settings_prod.py` huérfano) y pusheada a GitHub.

## Resumen de lo que necesito que confirmes antes de poder avanzar al deploy real

1. El contenido real de `passenger_wsgi.py` de Banexa (`cat
   ~/public_html/api.kabymur.com/backend/passenger_wsgi.py`).
2. Cómo sirve Banexa `/static/` y `/media/` en producción hoy (revisar
   "Static Files Mappings" en cPanel → Setup Python App, o cualquier
   `.htaccess` del lado del servidor).
3. Si cPanel permite montar la app Python de tarjeta-digital en una
   subruta (`tarjeta.kabymur.com/api`) en vez del dominio completo.
4. Versión de PostgreSQL del cPanel (para saber si hace falta portar
   `config/pg_backend.py` de bot_ia).

No se desplegó nada al servidor — todo lo de esta tarea vive en el repo
local y en GitHub (`main` y la nueva rama `produccion`).
