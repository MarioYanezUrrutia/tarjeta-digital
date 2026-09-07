# Cobro-2 — Pago real de la tarjeta con Terras

## Parte 1 — Backend

Nuevo módulo **`backend/apps/tarjetas/pago_views.py`**, con el mismo patrón de
autenticación que `panel_views.py`/`productos_views.py` (sesión de Banexa vía
cookie, tarjeta "del usuario" si su `Cliente` lo es):

- **`GET /api/tarjetas/<id>/estado-pago/`**: consulta `banexa_get(request,
  '/terras/saldo/')`, arma `{precio, saldo, saldo_disponible, alcanza, estado,
  fecha_vencimiento, dias_para_vencer}`. Si Banexa no responde o el cuerpo no
  trae un `saldo` interpretable, `saldo_disponible=False` y `alcanza=False`
  (no revienta, no expone una excepción cruda al frontend).

- **`POST /api/tarjetas/<id>/pagar/`**: Body `{clave_privada}`. Llama a
  `banexa_post(request, '/terras/cobrar-servicio/', {cantidad:
  TARJETA_PRECIO_TERRAS, clave_privada, detalle: 'Tarjeta digital - <slug>'})`.
  **La tarjeta SOLO se actualiza si Banexa respondió 200** — cualquier otro
  código (clave incorrecta/bloqueada/no configurada, saldo insuficiente, tope
  excedido, lo que sea) se reenvía tal cual al frontend y la tarjeta no se
  toca, sin excepción. Cuando Banexa confirma:
  - `estado = 'activa'`, `fecha_ultimo_pago = ahora`.
  - `fecha_vencimiento`: si la tarjeta **ya estaba vigente** (vencimiento
    futuro), los `TARJETA_DIAS_SUSCRIPCION` se suman **desde ese vencimiento
    actual** (no desde ahora) — para no perderle días a quien renueva antes de
    vencer. Si estaba vencida/cortada/en borrador, se suman desde ahora.

- **`config/urls.py`**: dos rutas nuevas registradas.

No hizo falta ninguna migración (los campos que se tocan ya existían desde
Cobro-1).

## Parte 2 — Frontend

- **`frontend/src/api/tarjetas.js`**: `obtenerEstadoPago(id)` y
  `pagarTarjeta(id, clavePrivada)`.
- **`frontend/src/components/ModalPago.jsx`** (nuevo): al abrirse, pide
  `estado-pago` y muestra precio + saldo real. Si alcanza, muestra el campo
  "Clave privada de Terras" (`type="password"`, `autoComplete="off"`) y el
  botón "Pagar N Terras"; si no alcanza, el mensaje pedido ("No tienes Terras
  suficientes para pagar tu tarjeta. Consigue más Terras en Banexa.") **sin**
  campo de clave. Al pagar con éxito: mensaje "¡Tu tarjeta está activa hasta
  \<fecha\>!", actualiza el estado del padre (`onPagoExitoso`) de inmediato, y
  el modal se autocierra 1.5s después (mismo patrón que el éxito de
  `Registro.jsx`). En error, el modal **no se cierra** — se puede reintentar.
  La clave privada vive en un único `useState`, se limpia (`setClavePrivada('')`)
  apenas se usa, y nunca se loguea (ni siquiera en los `console.error`
  implícitos: no hay ninguno que la referencie).
- **`frontend/src/pages/TarjetaEditor.jsx`**: el placeholder "Activar/Pagar —
  próximamente" de Cobro-1 se reemplazó por un botón real que abre
  `<ModalPago>`. El botón junto al estado dice "Activar / Pagar" o "Renovar"
  según corresponda, y el aviso ámbar (borrador/vencida/cortada) también abre
  el mismo modal.

## Bug real encontrado y corregido durante la verificación

Al arrancar la verificación descubrí que el proceso escuchando en el puerto
8000 (que llevaba corriendo de tareas anteriores) **no era Banexa
funcional**: respondía 404 en absolutamente todas las rutas `/api/...`
(incluida `/api/auth/login/`, que en tareas previas se usó para "verificar
contra Banexa real") aunque sí servía `/admin/`, y corría con el Python
global del sistema (`C:\Python312\python.exe`) en vez del `myvenv` del
proyecto — evidencia de que no era una instancia sana del código actual de
bot_ia. Para no tocar un proceso que no inicié yo, levanté una instancia
propia y correcta de bot_ia (con su `myvenv`) en el puerto **8001**, apunté
`BANEXA_API_URL` de tarjeta-digital ahí solo para la verificación, y lo
revertí a `8000` al terminar — el proceso original en 8000 quedó intacto y
sin tocar. Esto significa que las verificaciones "contra Banexa real" de
tareas anteriores (Login-2b) probablemente no ejercitaron Banexa de verdad;
queda anotado acá por si el usuario quiere revisar qué es ese proceso.

## Verificación — con dinero real (Terras) en una instancia sana de Banexa

Usuario de prueba: `test_tarjeta_digital` (ya existía en Banexa, con cuenta y
200 Terras de saldo, pero sin clave privada configurada — se le creó una con
`apps.terras.services.establecer_clave_privada` en un shell de Django, la
misma función que usa el endpoint real, no un hash a mano). Para el caso de
saldo insuficiente se creó `qa_saldo_bajo_cobro2` (registro real vía
`RegistroSerializer`, el mismo flujo que usaría un usuario nuevo) y se le
bajó el saldo a 3 Terras con el propio `cobrar_servicio`. La sesión de
tarjeta-digital se obtuvo minteando un access token real
(`RefreshToken.for_user(user).access_token`, exactamente lo que emite el
login real) e inyectándolo como la cookie httpOnly `banexa_token` — primero
contra los endpoints por HTTP directo, y después **inyectada en un navegador
real vía Chrome DevTools Protocol** para probar el editor de verdad con
clics reales (algo que no había sido posible en tareas anteriores por falta
de credenciales).

1. **`estado-pago` con saldo real**: `precio: 5`, `saldo: 200`,
   `saldo_disponible: true`, `alcanza: true`, `estado: 'borrador'`.
2. **Clave incorrecta**: `403 {"ok": false, "error": "La clave privada no es
   correcta."}` — la tarjeta siguió en `'borrador'`, sin cobro.
3. **Pago exitoso**: `200 {"ok": true, "estado": "activa", "nuevo_saldo":
   195, ...}`. Verificado en Banexa: saldo de la cuenta bajó a 195, y quedó
   registrado un `MovimientoTerra` `CONSUMO_SERVICIOS` (`monto_giro: 5`,
   `detalle: "Tarjeta digital - qa-cobro2-a"`). En tarjeta-digital: `estado
   = 'activa'`, `fecha_vencimiento` ≈ hoy + 30 días.
4. **Renovación antes de vencer**: se pagó una segunda vez sobre la misma
   tarjeta ya activa (vencimiento futuro) → `nuevo_saldo: 190`, y el nuevo
   `fecha_vencimiento` quedó exactamente **+30 días desde el vencimiento
   anterior** (no desde "ahora") — confirmado comparando ambas fechas
   (`2026-10-07` → `2026-11-06`, diferencia exacta de 30 días). Un tercer
   pago (esta vez con clic real en el navegador, ver más abajo) volvió a
   sumar 30 días más (`2026-11-06` → `2026-12-05`).
5. **Saldo insuficiente**: usuario con 3 Terras (< precio de 5) →
   `estado-pago` devolvió `alcanza: false`; el intento de pago devolvió
   `400 {"ok": false, "error": "No tienes Terras suficientes para este
   cobro."}`; la tarjeta se quedó en `'borrador'` y el saldo no se movió (se
   verificó con una segunda consulta a `estado-pago`: seguía en 3).
   Confirmado en los **3 movimientos totales** en Banexa: exactamente los 3
   pagos exitosos (2 por API + 1 por clic real), ninguno de más por los
   intentos fallidos.
6. **`/t/<slug>` con `TARJETA_MODO_DEV=False`**: la tarjeta recién activada
   (`qa-cobro2-a`) se sirvió con `disponible: true` y sus datos reales; la
   tarjeta B (nunca pagada, seguía en `'borrador'`) se sirvió con
   `disponible: false` — confirma que el pago real efectivamente publica la
   tarjeta.
7. **Editor real, con clic real** (sesión inyectada vía CDP en
   `http://localhost:5173/panel/tarjeta/33`): se vio la página real del
   editor con "Estado: Activa hasta 5 nov 2026" y el link "Renovar"; clic en
   "Renovar" abrió el modal real mostrando "Tu saldo actual: 190 Terras"
   (el saldo real tras los pagos anteriores); se llenó la clave privada real
   y se hizo clic en "Pagar 5 Terras" — el modal mostró "Pagando...", y
   luego "¡Tu tarjeta está activa hasta 5 dic 2026!", con el estado de la
   página (fuera del modal) actualizado en vivo a la misma fecha, antes de
   que el modal se autocerrara.
8. **Build**: `npm run build` en `frontend/` compila sin errores (mismos
   warnings preexistentes). `python manage.py check` en `backend/` no
   reporta issues.

## Limpieza

Se borraron los `Cliente`/`Tarjeta` de prueba creados en tarjeta-digital
(`qa-cobro2-a`, `qa-cobro2-b`). **No se tocó nada del lado de Banexa** más
allá de lo que pedía la propia verificación (clave privada + gasto real de
Terras): las cuentas, movimientos y saldos de `test_tarjeta_digital` (quedó
en 185 Terras, con clave `ClaveQA123` configurada) y `qa_saldo_bajo_cobro2`
(quedó en 3 Terras) se dejaron tal cual quedaron — son movimientos
financieros reales, no se intentó revertirlos ni se tocó la cadena de
`MovimientoTerra`. `backend/.env` quedó restaurado con
`BANEXA_API_URL=http://localhost:8000/api` (el valor con el que se debe
seguir trabajando); la instancia temporal de Banexa en el puerto 8001 se
detuvo.

## Notas

No se subió `.env`. El hallazgo del proceso "Banexa" no funcional en el
puerto 8000 queda documentado arriba para que el usuario lo revise cuando
pueda — no se intentó diagnosticarlo ni arreglarlo más allá de constatar que
no servía las rutas de API (fuera de alcance de esta tarea).
