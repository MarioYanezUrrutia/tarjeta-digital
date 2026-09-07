# Cobro-3a — Correos de aviso/pago + vencimientos automáticos (modo consola) + imagen pública más grande

## Ajuste rápido — avatar público 20% más grande

Avatar (imagen o iniciales) de las 3 plantillas públicas (`PlantillaA/B/C.jsx`)
agrandado de `h-40 w-40` (160px) a **`h-48 w-48` (192px)** — coincide
exactamente con Tailwind, sin necesidad de un valor arbitrario. Texto de
iniciales subido de `text-4xl` a `text-5xl` para mantener la proporción.
Sigue centrado y no rompe el layout en un viewport de 420px (probado). El
editor **no se tocó** — su círculo de foto (112px, Ajuste de la tarea
anterior) queda como está.

## Configuración de correo (modo consola)

- **`backend/config/settings.py`**: `EMAIL_BACKEND` (default
  `django.core.mail.backends.console.EmailBackend`), `EMAIL_HOST`,
  `EMAIL_PORT` (587), `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`,
  `EMAIL_USE_TLS` (`True`), `DEFAULT_FROM_EMAIL` (`'Tarjeta Digital
  <no-reply@kabymur.com>'`) — todas leídas de variables de entorno, sin
  nada de SMTP hardcodeado. En dev, sin configurar nada, cae al backend de
  consola: `send_mail()` imprime el correo en la terminal.
- **`PUBLIC_BASE_URL`** (nueva, default `http://localhost:5173`): la URL
  pública del frontend, para armar el link de pago en los correos — mismo
  propósito que `VITE_PUBLIC_BASE_URL` del frontend, pero configurada
  aparte porque backend y frontend son procesos y `.env` distintos.
- **`.env.example`**: documentadas todas las variables SMTP (comentadas,
  sin valores reales) + `DEFAULT_FROM_EMAIL` y `PUBLIC_BASE_URL` con sus
  defaults de dev.

## Parte 1 — Contenido de los correos

Nuevo módulo **`backend/apps/tarjetas/correos.py`**, con `send_mail` de
Django, texto plano en español:

- `correo_aviso_vencimiento(tarjeta)`: "Tu tarjeta digital \"X\" vence
  hoy/mañana/en N días. Renuévala..." + link de pago.
- `correo_tarjeta_cortada(tarjeta)`: "...ha sido pausada por falta de pago
  y ya no se muestra públicamente. Actívala de nuevo aquí:" + link de pago.
- `correo_pago_confirmado(tarjeta)`: "¡Tu tarjeta digital \"X\" está activa
  hasta el DD-MM-YYYY!" — **enganchado a `pago_views.pagar_tarjeta`**, justo
  después de que la tarjeta se activa/renueva (solo si Banexa confirmó el
  cobro con 200).

Los tres van al email del `Cliente` dueño de la tarjeta; si no tiene email,
la función simplemente no manda nada (no revienta).

## Parte 2 — El link de pago

`_link_pago(tarjeta)` arma `${PUBLIC_BASE_URL}/panel/tarjeta/<id>` — lleva
al panel de la tarjeta, donde el dueño ve el botón "Activar/Pagar" /
"Renovar" (Cobro-2) una vez logueado. **Nunca localhost hardcodeado**: usa
la variable `PUBLIC_BASE_URL` de settings, así el mismo código sirve el
link correcto en dev y en producción sin tocar nada.

Dejé un `// TODO` (comentario, ver docstring de `_link_pago`) marcando que
una mejora futura sería un link con token único que lleve directo a la
pantalla de pago sin re-loguear — la idea original del "paga en 10
segundos" — pero **no** se implementó en esta fase, tal como pedía la
tarea.

## Parte 3 — Comando `revisar_vencimientos`

Nuevo management command
**`backend/apps/tarjetas/management/commands/revisar_vencimientos.py`**:

1. **Aviso previo**: tarjetas `'activa'` con `fecha_vencimiento` dentro de
   `TARJETA_DIAS_AVISO_PREVIO` días (y todavía en el futuro) →
   `correo_aviso_vencimiento`. Para no reenviar el mismo aviso el mismo
   día, se agregó el campo **`fecha_ultimo_aviso`** al modelo `Tarjeta`
   (con su migración, `0005_tarjeta_fecha_ultimo_aviso`) — si ya se avisó
   hoy, se salta esa tarjeta.
2. **Corte**: tarjetas `'activa'` cuyo vencimiento ya pasó → estado pasa a
   **`'vencida'`** (semántica sugerida por la propia tarea: el efecto
   público de "ya no se muestra" lo cubre solo `Tarjeta.esta_vigente()`,
   que ya exige `estado == 'activa'`) → `correo_tarjeta_cortada`.
3. **Idempotente**: correrlo de nuevo el mismo día no reenvía el aviso
   (bloqueado por `fecha_ultimo_aviso`) ni vuelve a "cortar"/avisar una
   tarjeta ya `'vencida'` (el filtro `estado='activa'` ya no la incluye).
   No cobra ni hace nada irreversible — solo lee, avisa y cambia `estado`.
4. Imprime un resumen: `"Avisos de vencimiento enviados: N. Tarjetas
   cortadas (pasadas a "vencida"): M."`.

## Verificación

Se crearon dos tarjetas de prueba reales en la base (borradas al terminar):
una `'activa'` con vencimiento a 2-3 días, y otra `'activa'` con
vencimiento ya pasado.

1. **Avatar público 192px**: confirmado visualmente en el navegador real,
   sobre la tarjeta real y activa del usuario (`tarjeta-9`), en las **3
   plantillas** (se cambió la plantilla temporalmente para la captura y se
   restauró a su valor original `C` al terminar) — se ve claramente más
   grande, centrado, sin romper el layout a 420px de ancho.
2. **Correo de aviso en consola**: al correr `python manage.py
   revisar_vencimientos`, se imprimió en la terminal un correo completo
   (asunto, from, to, cuerpo) con el texto *"Tu tarjeta digital 'Tarjeta
   Por Vencer' vence en 2 días..."* y el link
   **`http://localhost:5173/panel/tarjeta/35`** — la URL pública
   configurable (`PUBLIC_BASE_URL`), no localhost hardcodeado en el código.
3. **Vencimiento → corte**: la tarjeta con vencimiento pasado quedó con
   `estado='vencida'` en la base, se imprimió su correo de corte con el
   link correcto, y `TarjetaPublicaView` con `TARJETA_MODO_DEV=False`
   devolvió `disponible: False` para su slug — confirma que el corte
   automático de la vista pública funciona.
4. **Idempotencia**: se corrió el comando una segunda vez inmediatamente
   después — resultado: `"Avisos de vencimiento enviados: 0. Tarjetas
   cortadas: 0."` Ningún correo duplicado, ninguna tarjeta re-procesada.
5. **Build**: `npm run build` en `frontend/` compila sin errores (mismos
   warnings preexistentes, no relacionados). `python manage.py check` en
   `backend/` no reporta issues.

## Notas

No se subió `.env`. No quedó ningún dato ni tarjeta de prueba en la base al
terminar (se borraron los `Cliente`/`Tarjeta` de QA, y la plantilla de la
tarjeta real usada para la captura visual se restauró a su valor original).
Los 3 servicios (Banexa `:8000`, backend `:8010`, frontend `:5173`)
quedaron corriendo, tal como en la tarea anterior.
