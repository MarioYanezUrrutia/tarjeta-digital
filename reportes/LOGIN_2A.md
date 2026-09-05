# Login-2a — Login/registro con usuario/clave + rutas protegidas

Fecha: 2026-09-05

Objetivo: completar el backend intermediario con el endpoint de registro, y
construir todo el frontend de autenticación (login, registro, sesión,
rutas protegidas) contra Banexa. Google (Login-2b) queda fuera a propósito.

---

## Parte 1 — Backend: `POST /api/auth/registro/`

Agregado a `apps/cuentas/views.py` (`registro_view`) y registrado en
`apps/cuentas/urls.py` como primera ruta del módulo. Mismo patrón que
`login_view`/`google_login_view` ya existentes: arma el payload con los
campos que espera Banexa y lo reenvía tal cual a
`POST {BANEXA_API_URL}/auth/registro/` — Banexa valida todo (contraseñas
coinciden, username/email/whatsapp únicos, formato de nombres);
tarjeta-digital no repite esa lógica.

**Decisión: sin auto-login tras registrar.** El enunciado dejaba elegir; se
optó por la opción simple que sugería el propio enunciado — el usuario
recién creado queda en Banexa y debe iniciar sesión después, igual que hace
hoy el registro nativo de Banexa/Rosita. Evita duplicar la lógica de login
dentro de la vista de registro.

Manejo de respuestas:
- Banexa 201 → `{ok: true, message: '...'}` (mismo mensaje que da Banexa).
- Banexa 400 con errores de validación (formato DRF:
  `{"campo": ["mensaje", ...]}`) → se reenvían tal cual bajo
  `{ok: false, errors: {...}}`, mismo status 400, para que el formulario
  los muestre campo por campo. **Nota:** este formato es distinto al de
  `login`/`google` (que usan `{ok: false, error: '...'}` con un solo
  mensaje) porque así es como Banexa devuelve los errores de cada
  endpoint — `registro` es un `Serializer` de DRF (errores por campo),
  `login`/`google` son vistas a mano que arman un solo string. Se respetó
  la forma real de cada uno en vez de forzar un formato único.
- Banexa caído / respuesta inesperada → `{ok: false, error: '...'}`, 502.

---

## Parte 2 — Frontend: `AuthContext`

`frontend/src/context/AuthContext.jsx`:
- Al montar, llama `GET /api/auth/me/` (con `credentials: 'include'`) para
  saber si ya hay sesión — resultado en `user` (objeto o `null`) y
  `cargando` (`true` hasta que esa llamada inicial resuelve).
- Expone `user`, `cargando`, `login(username, password)`,
  `registro(campos)`, `logout()`.
- Todas las llamadas pasan por un helper interno (`llamarApi`) que siempre
  usa `credentials: 'include'` — imprescindible para que la cookie
  `banexa_token` viaje entre `5173` (frontend) y `8010` (backend de
  tarjeta-digital), orígenes distintos.
- Dejado un comentario explícito marcando dónde entra `loginConGoogle`
  cuando llegue Login-2b, sin tocar nada más de la forma del contexto.

---

## Parte 3 — Frontend: pantallas

- `frontend/src/pages/Login.jsx` (`/login`): usuario/correo + contraseña.
  Éxito → `navigate('/panel')`. Error → mensaje bajo el formulario (el
  `error` que devuelve `login()`, ej. "Credenciales inválidas", tal cual lo
  manda Banexa). Link a `/registro`.
- `frontend/src/pages/Registro.jsx` (`/registro`): nombre, apellido,
  usuario, correo, contraseña, confirmar contraseña, y WhatsApp en 3 campos
  (`cod_tel_pais_wp` precargado en `"56"`, `cod_tel_wp`,
  `whatsapp_persona`) — tal como los espera Banexa. Los `errors` por campo
  que devuelve el backend se pintan bajo el input correspondiente (mismo
  nombre de campo que usa Banexa, ej. `username`, `whatsapp_persona`); un
  error sin campo asociado (Banexa caído) se muestra como mensaje general.
  Éxito → mensaje de confirmación + redirección a `/login` a los 1.5 s.
  Link a `/login`.
- Estética: Tailwind, tarjeta blanca centrada sobre fondo gris claro
  (mismo lenguaje visual que ya usaba `pages/Home.jsx`), mobile-first,
  consistente con el resto del proyecto — deliberadamente distinta de las
  plantillas A/B/C de la tarjeta pública (esas son la piel del QR, esto es
  el "chrome" de la app).

## Parte 4 — Frontend: rutas protegidas

- `frontend/src/components/RutaProtegida.jsx`: mientras `cargando` es
  `true` muestra un spinner; sin `user` redirige a `/login`
  (`<Navigate replace>`); con `user` renderiza los hijos.
- `frontend/src/pages/Panel.jsx` (`/panel`, placeholder): "Hola,
  `<nombre_preferido || nombre_completo || username>`" + botón "Cerrar
  sesión" que llama `logout()` y navega a `/login`.
- `frontend/src/App.jsx`: `/panel` envuelta en `<RutaProtegida>`;
  `/`, `/t/:slug`, `/login`, `/registro` sin protección — **`/t/:slug` no
  se tocó** (sigue completamente pública, como debe ser para el QR).

---

## Verificación

Banexa en `8000`, backend de tarjeta-digital en `8010`, frontend en
`5173`. Flujo completo automatizado con Chrome headless (Playwright,
mismo enfoque que en fases anteriores) en dos contextos de navegador
separados (uno "con sesión", otro "sin sesión", para simular ventana
incógnito):

1. **Registro** (`/registro`, usuario nuevo `login2a_<timestamp>`) →
   mensaje *"Usuario registrado exitosamente. Ya puedes iniciar sesión."* y
   redirección automática a `/login`. Cuenta quedó creada en Banexa (no se
   tocó ninguna cuenta existente).
2. **Login** con esa cuenta → redirección a `/panel`, texto visible:
   *"Hola, Loginn Prueba"*.
3. **Ruta protegida sin sesión**: un contexto de navegador nuevo (sin
   cookies) pide `/panel` directo → redirige a `/login`.
4. **Logout**: desde `/panel`, botón "Cerrar sesión" → vuelve a `/login`;
   pedir `/panel` de nuevo (misma pestaña) → sigue mandando a `/login`
   (la cookie ya no sirve).
5. **Página pública intacta**: el contexto sin sesión visita `/t/demo` →
   se ve completo, con "Mario Yáñez" y el resto de los datos de la Fase
   A.3, sin pedir login en ningún momento.
6. **`npm run build`** → sin errores (`dist/assets/index-*.css` 16.94 kB,
   `index-*.js` 208.53 kB).

Capturas de `/login` y `/registro` revisadas a mano para confirmar que
Tailwind renderiza bien (sin regresión del bug de sintaxis v3/v4 corregido
en la Fase A.2).

`manage.py check` (tarjeta-digital, tras agregar `registro_view`):
`System check identified no issues (0 silenced)`.

---

## Archivos creados/modificados

- `backend/apps/cuentas/views.py` (modificado — `registro_view`)
- `backend/apps/cuentas/urls.py` (modificado — ruta `registro/`)
- `frontend/src/context/AuthContext.jsx` (nuevo)
- `frontend/src/components/RutaProtegida.jsx` (nuevo)
- `frontend/src/pages/Login.jsx` (nuevo)
- `frontend/src/pages/Registro.jsx` (nuevo)
- `frontend/src/pages/Panel.jsx` (nuevo)
- `frontend/src/App.jsx` (modificado — rutas `/login`, `/registro`,
  `/panel` protegida, `AuthProvider` envolviendo todo)
- `reportes/LOGIN_2A.md` (este archivo)

No versionado (correcto, gitignored): `frontend/.env` no cambió en esta
tarea (ya apuntaba a `:8010` desde Login-1).

## Pendiente (fuera de esta tarea)

- **Login-2b**: botón de Google en `/login`/`/registro`, usando
  `POST /api/auth/google/` (ya existe en el backend desde Login-1) y una
  función `loginConGoogle` en `AuthContext` — el comentario que marca dónde
  agregarla ya está puesto.
- El panel real (formulario de datos de la tarjeta) — `Panel.jsx` es
  intencionalmente un placeholder.
- Refrescar el access token: sigue sin existir un endpoint de `refresh` en
  Banexa (ya documentado en `DIAG_AUTH_PARA_TARJETAS.md`); con 7 días de
  vigencia no es urgente, pero cuando venza el usuario deberá volver a
  loguearse — `/me` ya maneja ese caso (401 → limpia la cookie → el
  `RutaProtegida` manda a `/login`).
