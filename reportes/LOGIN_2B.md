# Login-2b — Login/registro con Google

## Parte 1 — Client ID

- **Frontend**: nueva variable `VITE_GOOGLE_CLIENT_ID` en `frontend/.env`
  (local, sin valor — gitignorado, no se sube) y documentada en
  `frontend/.env.example` (nuevo archivo, sin valor real, con comentario de
  dónde sacarlo y qué requiere en Google Cloud Console).

  **Acción pendiente para el usuario**: poner el Client ID real en
  `frontend/.env` como `VITE_GOOGLE_CLIENT_ID=<tu client id>.apps.
  googleusercontent.com`. Mientras esa variable esté vacía, el botón de
  Google se muestra pero queda deshabilitado (ver Parte 2).

- **Backend**: no se tocó nada. Confirmado en el código de Banexa
  (`bot_ia/backend/apps/api/auth_views.py::google_auth`) que la validación
  del token es un `GET https://www.googleapis.com/oauth2/v3/userinfo` con el
  token que le llega — Banexa nunca verifica el token contra un Client ID
  específico de Google (eso lo hace implícitamente la respuesta 200/401 de
  Google), así que ni Banexa ni el backend intermediario de tarjeta-digital
  (`apps.cuentas.views.google_login_view`, ya existente desde Login-1)
  necesitan conocer el Client ID — solo el frontend, para poder abrir el
  flujo de OAuth de Google.

## Parte 2 — El botón de Google

- **Librería**: `@react-oauth/google` (`^0.13.5`) — es la librería estándar
  actual para Google Identity Services en React, wrapper delgado sobre el
  script oficial de Google (`accounts.google.com/gsi/client`).
- **`frontend/src/main.jsx`**: la app entera queda envuelta en
  `<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>` (nuevo
  `frontend/src/config/google.js` lee `VITE_GOOGLE_CLIENT_ID`). El Provider
  se monta SIEMPRE, incluso con `clientId=''`, porque `useGoogleLogin`
  necesita ese contexto en el árbol para no reventar al montarse (ver el bug
  de abajo).
- **Flujo de token — `useGoogleLogin`, no `<GoogleLogin>` de One Tap**: se
  usa `useGoogleLogin` con el flujo por default (`flow: 'implicit'`), que
  abre un popup de OAuth de Google y entrega un **access token** en
  `onSuccess({ access_token })`. Es el tipo de token que Banexa espera: como
  confirma `google_auth` en Banexa, hace `GET .../oauth2/v3/userinfo` con
  `Authorization: Bearer <token>` — eso funciona con un access token, NO con
  el `credential`/id_token que entrega `<GoogleLogin>` (One Tap/botón
  oficial), que es un JWT firmado pensado para decodificarse localmente, no
  para mandarse a `userinfo`. Usar el componente `<GoogleLogin>` habría
  requerido cambiar `google_auth` en Banexa para verificar un id_token en
  vez de golpear `userinfo` — explícitamente fuera de alcance de esta tarea.
- **`frontend/src/context/AuthContext.jsx`**: nueva función
  `loginConGoogle(tokenGoogle)` en el lugar marcado por el comentario de
  Login-2a — mismo patrón que `login()`: `POST /api/auth/google/` con
  `{token: tokenGoogle}`, `credentials:'include'` (vía `llamarApi`, sin
  cambios ahí), guarda `user` en el mismo estado si `ok`.
- **`Login.jsx` / `Registro.jsx`**: agregado `<BotonGoogle>` bajo un
  divisor "o", debajo del formulario. En éxito llama a `loginConGoogle` y
  navega a `/panel` (igual que el submit normal); en error, muestra el
  mismo bloque de error que ya existía en cada pantalla.

## Bug real encontrado y corregido: `clientId` vacío rompía toda la pantalla

Con `VITE_GOOGLE_CLIENT_ID` vacío (el estado en el que queda el repo hasta
que el usuario ponga su Client ID real), `useGoogleLogin` intenta
inicializar el cliente OAuth de Google (`google.accounts.oauth2.
initTokenClient({ client_id: '', ... })`) en un `useEffect` **apenas se
monta el componente** — no solo al hacer clic. El SDK de Google lanza ahí
mismo una excepción síncrona (`"Missing required parameter client_id."`),
no capturada, que React trata como un error de renderizado y **desmonta
toda la pantalla** (`/login` o `/registro` quedaban en blanco). Se detectó
verificando la consola del navegador (no era visible solo con capturas de
pantalla — el crash era intermitente según el timing del efecto).

**Corrección**: `BotonGoogle` ahora renderiza uno de dos componentes según
si `VITE_GOOGLE_CLIENT_ID` está configurado:
- Configurado → `BotonGoogleActivo`, que sí llama a `useGoogleLogin`.
- No configurado → `BotonGoogleDeshabilitado`, un `<button disabled>` plano
  que **nunca llama al hook**, evitando que el SDK de Google intente
  inicializarse con un client_id vacío. Muestra un `title` indicando que
  falta configurar la variable.

Esto es necesario mientras el Client ID real no esté puesto — apenas el
usuario lo agregue a `frontend/.env`, el botón pasa a `BotonGoogleActivo`
automáticamente, sin tocar código.

## Parte 3 — Estética

Botón con el logo oficial de Google (SVG de 4 colores inline, sin depender
de una imagen externa) + texto "Continuar con Google" (o "Registrarse con
Google" en el registro), ancho completo, mismo `rounded-md`/`border`/
tamaño de fuente que el resto de los inputs y botones del login/registro.
Separado del formulario por un divisor "── o ──".

## Verificación

**Con navegador real (Edge headless + Chrome DevTools Protocol, viewport
real verificado con `window.innerWidth`, no solo el flag de la herramienta
de captura)**, sin Client ID real configurado (no está disponible en este
entorno — lo pone el usuario):

1. **El botón aparece en `/login` y `/registro`**: confirmado visualmente,
   con su ícono y texto, debajo del divisor "o". Sin el fix del bug de
   arriba, esto NO se cumplía (pantalla en blanco) — con el fix, se
   confirmó en una pestaña nueva y sin excepciones en consola
   (`Runtime.exceptionThrown`), en ambas pantallas.
2. **Login con Google real → Banexa → `/panel`**: **NO se pudo probar** —
   requiere el Client ID real (lo pone el usuario) y una cuenta de Google
   real interactuando con el popup de OAuth, algo que este entorno headless
   sin credenciales no puede completar. La lógica está cableada y probada
   hasta donde es posible sin esas dos cosas: `BotonGoogleActivo` llama
   correctamente a `useGoogleLogin`, `onSuccess` extrae `access_token` y
   llama a `loginConGoogle`, que pega al endpoint correcto con el body
   correcto (mismo código ya usado y probado en `login()`/`registro()`).
3. **Login con usuario/clave sigue funcionando**: confirmado con una prueba
   real de punta a punta — se llenaron los campos del formulario (vía
   React, no solo `.value`) y se envió contra el backend real (`:8010`) y
   Banexa real (`:8000`) con credenciales inexistentes a propósito; la
   respuesta de error se recibió y se mostró en pantalla sin romper nada
   (`"No se pudo completar la solicitud."`), y el botón de Google siguió
   presente y sin afectar el formulario.
4. **Build**: `npm run build` en `frontend/` compila sin errores (los
   mismos warnings preexistentes de `react-router`, más uno nuevo idéntico
   de `@react-oauth/google` sobre "use client" — inofensivo, mismo patrón).

## Notas

No se subió `.env`. `frontend/.env.example` es nuevo (antes no existía) y
documenta también `VITE_API_BASE`, que ya se usaba pero no estaba
documentado en ningún ejemplo.
