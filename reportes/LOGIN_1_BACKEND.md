# Login-1 — Backend intermediario con Banexa

Fecha: 2026-09-05

Objetivo: que tarjeta-digital autentique usuarios contra Banexa (bot_ia) de
forma segura — el backend de tarjeta-digital hace de intermediario
servidor-a-servidor, el access token de Banexa nunca llega al navegador del
usuario (vive solo en una cookie httpOnly), y tarjeta-digital no persiste
ningún dato de usuario: lo consulta a Banexa en cada request.

## App usada: `apps.cuentas` (nueva)

Se creó una app nueva en vez de meter esto en `apps.tarjetas`: autenticación
es un concern separado del dominio de tarjetas (Cliente/Tarjeta/Producto), y
`apps.cuentas` no tiene ni necesita modelos propios — solo vistas que
reenvían a Banexa. Mantiene `apps.tarjetas` enfocada en lo suyo.

Archivos nuevos:
- `backend/apps/cuentas/__init__.py`
- `backend/apps/cuentas/apps.py`
- `backend/apps/cuentas/banexa.py` — cliente delgado hacia Banexa (Parte 4)
- `backend/apps/cuentas/views.py` — las 4 vistas (Parte 3)
- `backend/apps/cuentas/urls.py`

Registrada en `INSTALLED_APPS` y montada en `config/urls.py` bajo
`path('api/auth/', include('apps.cuentas.urls'))`. No tiene modelos, así
que no generó ninguna migración.

---

## Parte 1 — Puerto 8010

- El backend de tarjeta-digital **debe levantarse con**
  `python manage.py runserver 8010` (no hay forma de fijar un puerto por
  defecto en `manage.py runserver` sin parchear el comando; se documenta
  acá y es lo que se usó en toda la verificación).
- `frontend/.env` (no versionado, solo local): `VITE_API_BASE` pasó de
  `http://localhost:8000/api` a `http://localhost:8010/api`.
- `frontend/.env.production` no se tocó — ya apuntaba a
  `https://api.tarjeta-digital.example.com/api`, que es el backend de
  tarjeta-digital en producción, no Banexa. Sigue siendo correcto.
- `GET /api/health/` respondió `{"status": "ok"}` en `http://localhost:8010/api/health/`
  (ver Verificación).

## Parte 2 — `BANEXA_API_URL`

En `backend/config/settings.py`:

```python
# --- Banexa (bot_ia): backend de autenticación y banco de Terras ---
# dev: http://localhost:8000/api. Producción: https://api.kabymur.com/api
# (se setea en el .env de cada entorno, nunca hardcodeado acá).
BANEXA_API_URL = env('BANEXA_API_URL', default='http://localhost:8000/api')
```

Agregada a `backend/.env.example` (commiteable) y a `backend/.env` (real,
local, NO se sube — está en `.gitignore`):

```
BANEXA_API_URL=http://localhost:8000/api
```

`requests` se instaló en `backend/.venv` y se agregó a
`backend/requirements.txt`.

## Parte 3 — Endpoints

Los cuatro viven en `apps/cuentas/views.py`, montados bajo `/api/auth/`:

- **`POST /api/auth/login/`** — Body `{username, password}` (username admite
  email, igual que Banexa). Reenvía a `POST {BANEXA_API_URL}/auth/login/`.
  Si Banexa devuelve 200: guarda `access` en la cookie httpOnly
  `banexa_token` y responde `{ok: true, user: {...}}` — el token JAMÁS va en
  el body de la respuesta al frontend. Si Banexa devuelve error, se traduce
  a `{ok: false, error: '...'}` con el mismo status (400/401/403/404) o 502
  si Banexa devolvió algo inesperado (caído, 500, etc.).
- **`POST /api/auth/google/`** — Igual, con `{token}` (de Google), reenvía a
  `POST {BANEXA_API_URL}/auth/google/`.
- **`GET /api/auth/me/`** — Sin cookie → 401 `{ok: false}` sin llamar a
  Banexa. Con cookie → `GET {BANEXA_API_URL}/auth/perfil/` con
  `Authorization: Bearer <token de la cookie>`. 200 de Banexa → `{ok: true,
  user: {...}}` (datos frescos, nunca guardados). 401 de Banexa (token
  vencido/inválido) → borra la cookie local y responde 401 `{ok: false}`.
  Cualquier otra cosa (Banexa caído) → 502.
- **`POST /api/auth/logout/`** — Borra la cookie `banexa_token` y responde
  `{ok: true}`. No hay endpoint en Banexa para invalidar el token del lado
  del servidor — sigue siendo válido hasta que expire por su cuenta (7
  días), tarjeta-digital simplemente deja de guardarlo.

### Cookie

`apps/cuentas/banexa.py::set_cookie_token`:
- Nombre: `banexa_token`.
- `httponly=True` (JS del frontend nunca puede leerla).
- `secure=not settings.DEBUG` — en dev (`DEBUG=True`, http) no exige
  Secure, o el navegador la descartaría; en producción (`DEBUG=False`,
  siempre https) sí.
- `samesite='Lax'`.
- `max_age` = 7 días (604800 s) — igual a `ACCESS_TOKEN_LIFETIME` de Banexa
  (`SIMPLE_JWT` en `config/settings.py` de bot_ia).

### CORS

```python
CORS_ALLOW_CREDENTIALS = True
```

`CORS_ALLOWED_ORIGINS` ya traía `http://localhost:5173` por defecto (no
hizo falta tocarlo). **Nota para Login-2** (frontend, fuera de esta tarea):
toda petición del frontend hacia estos endpoints necesita
`fetch(..., { credentials: 'include' })` — si no, el navegador no manda ni
guarda la cookie cross-origin (5173 ↔ 8010).

## Parte 4 — Helper `apps.cuentas.banexa`

```python
def banexa_post_publico(path, data):       # login/google: sin token todavía
def token_de_cookie(request):              # extrae banexa_token del request
def banexa_get(request, path):             # GET autenticado (Bearer de la cookie)
def banexa_post(request, path, data=None): # POST autenticado (Bearer de la cookie)
def set_cookie_token(response, token):     # guarda el token tras login/google
def borrar_cookie_token(response):         # logout / token rechazado por Banexa
```

`banexa_get`/`banexa_post` son el punto de reuso pensado para más adelante
(ej. el cobro de Terras de una tarjeta contra
`POST {BANEXA_API_URL}/terras/cobrar-servicio/`, ver
`CONSUMO_SERVICIOS.md`/`ENDPOINT_COBRAR_SERVICIO.md` del lado de bot_ia):
ya resuelven sacar el token de la cookie del `request` de tarjeta-digital y
mandarlo como `Authorization: Bearer` a Banexa, devolviendo `None` sin
llamar a nada si no hay sesión.

---

## Verificación

Banexa (bot_ia) corriendo en `8000`, tarjeta-digital en `8010`. No había
usuario de prueba con contraseña conocida en el Banexa local (hay varios
usuarios reales de antes, pero sin su clave a mano) — se creó uno nuevo vía
el propio registro de Banexa, sin tocar ninguna cuenta existente:

```
POST http://localhost:8000/api/auth/registro/
{"username": "test_tarjeta_digital", "email": "test_tarjeta_digital@example.com",
 "password": "ClaveSegura123", "password_confirm": "ClaveSegura123",
 "primer_nombre": "Test", "apellido_paterno": "TarjetaDigital"}
→ 201 {"message": "Usuario registrado exitosamente...", "email": "..."}
```

**1. Login** — `POST http://localhost:8010/api/auth/login/` con ese
usuario:
```
HTTP/1.1 200 OK
Set-Cookie: banexa_token=eyJhbGci...; HttpOnly; Max-Age=604800; Path=/; SameSite=Lax
{"ok":true,"user":{"user_profile_id":54,"username":"test_tarjeta_digital", ...}}
```
Sin `access`/`refresh` en el body — confirmado.

**2. `/me` con la cookie** —
```
GET http://localhost:8010/api/auth/me/  (con la cookie del paso 1)
HTTP/1.1 200 OK
{"ok":true,"user":{"user_profile_id":54,"username":"test_tarjeta_digital", ...}}
```
Mismos datos, pedidos frescos a Banexa (`GET /auth/perfil/`).

**3. `/me` sin cookie** —
```
GET http://localhost:8010/api/auth/me/  (sin cookie)
HTTP/1.1 401 Unauthorized
{"ok":false}
```

**4. Logout y `/me` después** — se usó el mismo jar de cookies para login →
logout → me (así el jar refleja lo que un navegador real haría con el
`Set-Cookie` de borrado):
```
POST http://localhost:8010/api/auth/logout/
HTTP/1.1 200 OK
Set-Cookie: banexa_token=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/
{"ok":true}

GET http://localhost:8010/api/auth/me/  (con el jar ya sin la cookie)
HTTP/1.1 401 Unauthorized
{"ok":false}
```

**Bonus — credenciales inválidas** (no pedido explícitamente, pero rápido
de confirmar): `POST /api/auth/login/` con clave equivocada →
`401 {"ok":false,"error":"Credenciales inválidas"}` — el mensaje exacto de
Banexa, sin cookie seteada.

**5. `npm run build`** — compiló sin errores (`dist/assets/index-*.css`
14.90 kB, `index-*.js` 199.64 kB). El frontend del login (Login-2) no se
tocó en esta tarea; esto solo confirma que nada de lo hecho acá rompió el
build existente.

`manage.py check` (tarjeta-digital): `System check identified no issues (0
silenced)`.

---

## Archivos creados/modificados

- `backend/apps/cuentas/__init__.py` (nuevo)
- `backend/apps/cuentas/apps.py` (nuevo)
- `backend/apps/cuentas/banexa.py` (nuevo)
- `backend/apps/cuentas/views.py` (nuevo)
- `backend/apps/cuentas/urls.py` (nuevo)
- `backend/config/settings.py` (modificado — `apps.cuentas` en
  `INSTALLED_APPS`, `CORS_ALLOW_CREDENTIALS`, `BANEXA_API_URL`)
- `backend/config/urls.py` (modificado — monta `apps.cuentas.urls`)
- `backend/requirements.txt` (modificado — `requests`)
- `backend/.env.example` (modificado — `BANEXA_API_URL` documentada)
- `reportes/LOGIN_1_BACKEND.md` (este archivo)

No versionados (correctamente fuera de git, sin secretos reales expuestos):
- `backend/.env` (real, local) — se le agregó `BANEXA_API_URL` a mano.
- `frontend/.env` (real, local) — `VITE_API_BASE` actualizado a
  `http://localhost:8010/api`.

## Pendiente (fuera de esta tarea)

- **Login-2**: pantallas de login/registro en el frontend, usando
  `fetch(..., { credentials: 'include' })` contra estos 4 endpoints.
- **Login-3 / cobro**: usar `banexa_post(request, '/terras/cobrar-servicio/',
  {...})` para cobrar el pago de una tarjeta, reusando la cookie de sesión
  ya resuelta acá.
- Definir si `/api/auth/google/` necesita algo adicional del lado de
  tarjeta-digital (hoy es un passthrough puro, igual que login).
- El usuario de prueba `test_tarjeta_digital` quedó creado en el Banexa
  local (dev) para seguir probando — no se tocó ninguna cuenta real
  existente.
