# Cobro-1 — Modelo de suscripción + la página pública respeta el estado

Esta fase NO cobra todavía (eso es Cobro-2) — solo el modelo y que la página
pública deje de mostrarse cuando corresponde.

## Parte 1 — Modelo

- **`backend/apps/tarjetas/models.py`**, modelo `Tarjeta`:
  - Campos nuevos: `fecha_vencimiento` y `fecha_ultimo_pago`
    (`DateTimeField(null=True, blank=True)`). `plan` y `estado` ya existían
    (Fase A.1) — no se duplicaron.
  - Migración: `backend/apps/tarjetas/migrations/
    0004_tarjeta_fecha_ultimo_pago_tarjeta_fecha_vencimiento.py`, generada
    con `makemigrations` y aplicada con `migrate` (`manage.py check` sin
    issues).
  - Helpers nuevos (sin lógica de cobro — solo lectura):
    - `esta_vigente()`: `True` si `estado == 'activa'` y
      `fecha_vencimiento` existe y es futura.
    - `dias_para_vencer()`: días que faltan (negativo si ya venció), o
      `None` si `fecha_vencimiento` es `None` (nunca se pagó).

- **`backend/config/settings.py`** — constantes nuevas, todas configurables
  por variable de entorno:
  - `TARJETA_PRECIO_TERRAS` (default `5`)
  - `TARJETA_DIAS_SUSCRIPCION` (default `30`)
  - `TARJETA_DIAS_AVISO_PREVIO` (default `5`)
  - `TARJETA_MODO_DEV` (default `True`) — ver Parte 2.
  - Documentadas en `backend/.env.example` y agregadas también al
    `backend/.env` local (con los mismos valores por defecto, para que
    queden visibles/editables sin tener que ir a leer `settings.py`).

## Parte 2 — La página pública respeta el estado

**Elegí devolver 200 con `{disponible: false}`** (la opción que recomendaba
la propia tarea), no un 404 — así el frontend puede mostrar un mensaje
amable en vez de tratarlo como un error de red/página inexistente. El 404
se mantiene reservado para el caso realmente distinto: el slug no existe en
absoluto.

- **`TarjetaPublicaView.get()`** (`backend/apps/tarjetas/views.py`):
  1. Si el slug no existe → 404 (sin cambios).
  2. Si `not settings.TARJETA_MODO_DEV and not tarjeta.esta_vigente()` →
     `200 {"disponible": false}` — **sin ningún otro dato de la tarjeta**
     (verificado que no se filtra nombre, foto, contacto, etc.). Una
     tarjeta en `'borrador'` (nunca pagada) cae acá igual que una
     `'vencida'` o `'cortada'`, tal como pedía la tarea.
  3. Si está vigente (o `TARJETA_MODO_DEV=True`) →
     `200 {"disponible": true, ...datos de TarjetaPublicaSerializer}`.

- **`TARJETA_MODO_DEV`** (bypass de desarrollo): con `True`, el chequeo de
  vigencia se salta por completo — se muestra la tarjeta sin importar su
  `estado`. Es necesario porque **todas** las tarjetas existentes hoy nacen
  y se quedan en `'borrador'` (no existe el cobro real todavía); sin este
  flag, ninguna tarjeta se podría ver mientras se desarrolla Cobro-2/3.
  **Debe quedar en `False` en producción** — así quedó documentado en
  `settings.py` y en `.env.example`.

- **`frontend/src/pages/TarjetaPublica.jsx`**: ahora distingue tres estados
  además de "cargando":
  - `disponible: false` → página limpia, oscura, con el texto exacto
    pedido: *"Esta tarjeta no está disponible en este momento."* — sin
    ningún dato de la tarjeta.
  - 404 (no existe) → *"Esta tarjeta no existe."* (mensaje separado del
    anterior, para no confundir "no existe" con "existe pero no vigente").
  - Disponible → se renderiza la plantilla normal, igual que antes.

## Parte 3 — Estado en el panel y el editor

- **`frontend/src/constants/tarjetas.js`**: nueva función
  `descripcionEstado(estado, fechaVencimiento)` — `"Borrador (sin
  publicar)"`, `"Activa hasta 21 sept 2026"` (con `formatearFecha`),
  `"Vencida"`, `"Cortada"` (fallback a `ESTADO_LABEL`).
- **`backend/apps/tarjetas/serializers.py`**: `fecha_vencimiento` agregado
  a `MisTarjetasSerializer` (lista del panel) y `fecha_vencimiento` +
  `fecha_ultimo_pago` a `TarjetaPanelSerializer` (ambos de solo lectura —
  no se editan por PATCH, solo los va a tocar el cobro real).
- **`frontend/src/pages/Panel.jsx`**: la lista de tarjetas usa
  `descripcionEstado(t.estado, t.fecha_vencimiento)` en vez de solo
  `ESTADO_LABEL[t.estado]`.
- **`frontend/src/pages/TarjetaEditor.jsx`**:
  - Nuevo estado local `estado`/`fechaVencimiento`, cargado del `GET` de la
    tarjeta (mismo patrón que `imagenUrl`/`slug`).
  - Línea "Estado: {descripcionEstado(...)}" debajo del header.
  - Si `estado === 'borrador'`: aviso ámbar con el texto pedido ("Tu
    tarjeta aún no está publicada. Actívala pagando tu suscripción...") y
    un botón **"Activar / Pagar — próximamente"**, deshabilitado
    (`disabled`, con `title` explicando por qué), con un
    `{/* TODO Cobro-2: cobro real de la suscripción (Terras vía Banexa) */}`
    marcando dónde va la lógica real. No se implementó ningún cobro acá.

## Verificación

**Backend (vista real, `TarjetaPublicaView.as_view()` invocada con
`APIRequestFactory`, más un tramo con navegador real vía Chrome DevTools
Protocol contra el backend y frontend reales corriendo)**:

1. **Migración**: aplicada sin errores; `fecha_vencimiento` y
   `fecha_ultimo_pago` existen en la tabla (confirmado creando tarjetas de
   prueba con esos campos poblados y releyéndolos de la base).
2. **`esta_vigente()` / `dias_para_vencer()`**: probados con 4 tarjetas
   (borrador, activa+futura, activa+vencida, cortada) — resultados
   correctos en los 4 casos.
3. **`TARJETA_MODO_DEV=True`** (valor con el que queda el repo): las 4
   tarjetas de prueba (incluida una en borrador) devolvieron
   `disponible: true` — confirmado además en el navegador real con
   `/t/demo` (tarjeta real, `estado='activa'` pero sin `fecha_vencimiento`
   — o sea que sin el bypass tampoco se vería): se sigue viendo normal.
4. **`TARJETA_MODO_DEV=False`** (probado reiniciando el backend con esa
   variable, luego restaurado a `True` antes de terminar): `/t/demo` pasó a
   mostrar *"Esta tarjeta no está disponible en este momento."*; una
   tarjeta de prueba con `estado='activa'` y `fecha_vencimiento` futura
   real (`/t/suscriptor-activo`) se siguió viendo normal — confirmando que
   el chequeo de vigencia en sí funciona, no solo el bypass.
5. **Panel**: `MisTarjetasSerializer` expone `fecha_vencimiento`
   correctamente (confirmado leyendo la respuesta real del serializer); el
   helper `descripcionEstado` del frontend probado con esos mismos datos
   produce `"Activa hasta 21 sept 2026"`, `"Borrador (sin publicar)"`,
   `"Vencida"`, `"Cortada"`. **No se pudo ver el panel real en el
   navegador** (requiere sesión de Banexa, sin credenciales disponibles en
   este entorno) — el cableado se verificó por serializer + código, mismo
   límite que en tareas anteriores del panel.
6. **Editor**: el aviso de borrador + botón placeholder se revisó por
   código (mismo patrón ya usado y probado para `imagenUrl`/`slug` en
   Panel-2) — tampoco se pudo clickear en el editor real por la misma
   razón de credenciales.
7. **Build**: `npm run build` en `frontend/` compila sin errores (mismos
   warnings preexistentes). `python manage.py check` en `backend/` no
   reporta issues.

## Notas

No se subió `.env`. Los datos y tarjetas de prueba creados para la
verificación se borraron al terminar; no quedó ningún archivo de media de
prueba. `TARJETA_MODO_DEV` quedó en `True` en el `.env` local (el valor con
el que se debe seguir desarrollando Cobro-2/3).
