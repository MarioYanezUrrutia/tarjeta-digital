# Panel-1 — Inicio del panel + formulario base de la tarjeta

Fecha: 2026-09-05

Objetivo: el usuario ya logueado (login-2a) entra a `/panel`, ve sus
tarjetas (o el estado vacío con botón para crear), crea/edita una tarjeta
con los campos de texto, flags y plantilla, y puede ver el resultado en
`/t/<slug>`. Foto (Panel-2) y productos (Panel-3) quedan como secciones
"próximamente".

---

## Decisión técnica: `Cliente` se mantiene, resuelto por `banexa_user_id`

Se eligió la opción más simple del enunciado: **recuperar o crear un
`Cliente` automáticamente por `banexa_user_id`**, sin pedirle nada al
usuario y **sin migración nueva** — el modelo `Cliente` de la Fase A.1 ya
tenía el campo `banexa_user_id` (`CharField`, blank/null) exactamente para
esto, solo que nunca se había usado.

`_obtener_o_crear_cliente(perfil_banexa)` en
`apps/tarjetas/panel_views.py`:

```python
def _obtener_o_crear_cliente(perfil_banexa):
    banexa_user_id = str(perfil_banexa['user_profile_id'])
    cliente, _creado = Cliente.objects.get_or_create(
        banexa_user_id=banexa_user_id,
        defaults={
            'origen': 'kabymur',
            'nombre': (perfil_banexa.get('nombre_completo') or perfil_banexa.get('username') or '').strip(),
            'email': perfil_banexa.get('email') or '',
        },
    )
    return cliente
```

**Por qué esta opción y no colgar `Tarjeta` directo del `banexa_user_id`:**
- No requiere tocar el modelo `Tarjeta` ni su migración — el límite de 3
  tarjetas, la unicidad de `slug` y el resto de la lógica de Fase A.1 ya
  están escritos contra `Tarjeta.cliente` (FK a `Cliente`); cambiar eso
  habría significado reescribir `Tarjeta.clean()`/`save()` sin necesidad.
- `Cliente` ya existía con este propósito exacto en el diseño original (el
  campo `banexa_user_id` no estaba de adorno) — usarlo es completar algo
  que ya estaba pensado, no agregar una capa nueva.
- Dejar `Cliente` vivo también deja espacio para que en el futuro tenga
  más responsabilidades propias (facturación, datos de la empresa/negocio,
  etc.) sin otra migración de por medio.

**Trade-off aceptado:** `Cliente.nombre`/`Cliente.email` quedan como
*snapshot* del primer login — si el usuario cambia su nombre en Banexa
después, `Cliente` no se actualiza solo (no hay sincronización periódica).
No importa para esta fase: `Cliente` no se muestra en ningún lado, solo
existe para colgar `Tarjeta`s. Documentado como pendiente al final.

---

## Parte 1 — Backend: endpoints del panel

### Cómo se identifica al usuario

`apps/cuentas/auth.py` (nuevo): `resolver_perfil_banexa(request)` — lee la
cookie httpOnly, le pide a Banexa `GET /auth/perfil/` con ese token, y
devuelve `(perfil, None)` con sesión válida o `(None, Response)` ya armado
(401 sin sesión / sesión rechazada — borra la cookie local igual que
`me_view` —, 502 si Banexa no responde). Mismo patrón manual que ya usaba
`apps.cuentas.views` — no hay `request.user`/`IsAuthenticated` de DRF de
por medio porque no hay usuario local, vive en Banexa.

Se dejó como función separada en vez de tocar `apps/cuentas/views.py::me_view`
(que ya estaba verificado en Login-1/2a) para no arriesgar una regresión en
un endpoint que ya funcionaba — implica un pequeño duplicado de lógica
entre ambos, aceptado a propósito.

### Endpoints (`apps/tarjetas/panel_views.py`, nuevo)

- **`GET /api/mis-tarjetas/`** — lista `id, slug, nombre_mostrado, plan,
  estado, plantilla` de las tarjetas del `Cliente` del usuario (vacío si
  todavía no tiene `Cliente`, es decir, nunca creó nada).
- **`POST /api/tarjetas/`** — crea una tarjeta en blanco
  (`tipo='persona'`, `plan='kabymur_basico'` por defecto — no hay flujo de
  planes/pricing todavía, es un placeholder hasta que exista), reutilizando
  `_obtener_o_crear_cliente`. El slug lo genera `Tarjeta.save()` (ya
  existía desde la Fase A.1: `tarjeta-<cliente_id>` si no hay nombre, con
  sufijo si choca). El límite de 3 lo sigue validando
  `Tarjeta.clean()`/`full_clean()` (tampoco tocado) — acá solo se traduce
  el `ValidationError` a `400 {"ok": false, "error": "..."}`.
- **`GET /api/tarjetas/<id>/`** — todos los campos editables de una
  tarjeta propia (para precargar el formulario).
- **`PATCH /api/tarjetas/<id>/`** — edición parcial: solo pisa los campos
  de `CAMPOS_EDITABLES` que vengan en el body (exactamente los que pedía
  el enunciado: identidad, contacto, redes, sobre, ubicación, plantilla, y
  los 5 flags `mostrar_*`). El slug **no se regenera** al cambiar
  `nombre_mostrado` — `// TODO` explícito en el código, tal como pedía la
  tarea.
- **Seguridad**: `_obtener_tarjeta_del_cliente(cliente, tarjeta_id)`
  filtra siempre por `cliente=cliente` — si el id no existe o es de otro
  usuario, `404 {"ok": false, "error": "Tarjeta no encontrada"}` en ambos
  casos, **sin distinguir** cuál de las dos cosas pasó (así no se puede
  usar la respuesta para adivinar si un id ajeno existe).

`TarjetaPublicaSerializer`/`TarjetaPublicaView` (la página pública, `/t/<slug>`,
Fase A.2/A.3) **no se tocaron** — son de solo lectura, sin sesión, y no
tenían nada que ver con esto.

Serializers nuevos en `apps/tarjetas/serializers.py`:
`MisTarjetasSerializer` (lista) y `TarjetaPanelSerializer` (detalle/PATCH,
sin `imagen` ni `productos` a propósito — quedan fuera de esta fase).

---

## Parte 2 y 3 — Frontend

- `frontend/src/api/cliente.js` (nuevo): el helper `llamarApi` que antes
  vivía dentro de `AuthContext.jsx` se sacó a un módulo compartido —
  `AuthContext` lo sigue usando igual, y ahora `api/tarjetas.js` también.
  Sin cambio de comportamiento, solo se dejó de duplicar.
- `frontend/src/api/tarjetas.js` (nuevo): `obtenerMisTarjetas`,
  `crearTarjeta`, `obtenerTarjeta(id)`, `actualizarTarjeta(id, campos)` —
  todas con `credentials: 'include'`.
- `frontend/src/constants/tarjetas.js` (nuevo): mapas de etiquetas
  (`PLANTILLA_LABEL`, `ESTADO_LABEL`) y la lista `PLANTILLAS_DISPONIBLES`
  (valor + nombre + mini-descripción de A/B/C) que usan tanto la lista del
  panel como el selector del formulario.
- `frontend/src/pages/Panel.jsx` (reemplazado, ya no es el placeholder):
  saludo, `GET /api/mis-tarjetas/` al cargar, estado vacío con "Crear mi
  tarjeta" (crea y navega al editor), o lista de tarjetitas con
  nombre/estado/plantilla + "Editar" por cada una, + "Crear otra tarjeta"
  si tiene menos de 3. Botón "Cerrar sesión" conservado. Comentario `// TODO`
  para las promos del ecosistema Kabymur.
- `frontend/src/pages/TarjetaEditor.jsx` (nuevo, ruta
  `/panel/tarjeta/:id`): `GET` al cargar para precargar; secciones
  Identidad / Contacto / Redes / Sobre / Ubicación / Productos / Plantilla,
  cada bloque de flags con su interruptor "Mostrar"; foto y productos como
  cajas "próximamente" deshabilitadas con `// TODO Panel-2`/`// TODO Panel-3`;
  selector de plantilla con las 3 opciones y su descripción; botón
  "Guardar" → `PATCH`, con mensaje de éxito/error; enlace "Ver mi tarjeta
  pública" → `/t/<slug>` en pestaña nueva.
- `frontend/src/App.jsx`: se agregó la ruta `/panel/tarjeta/:id`, protegida
  con el mismo `RutaProtegida` que ya protegía `/panel`.

---

## Verificación

Banexa `8000`, backend `8010`, frontend `5173`. Automatizado con Chrome
headless (Playwright), dos usuarios de prueba nuevos registrados vía la API
de Banexa (no se tocó ninguna cuenta existente).

1. **Estado vacío** — usuario nuevo entra a `/panel`: *"Todavía no tienes
   ninguna tarjeta digital"* + botón "Crear mi tarjeta" (confirmado por
   captura de pantalla).
2. **Crear** — clic en el botón → `POST /api/tarjetas/` → navega a
   `/panel/tarjeta/<id>`.
3. **Llenar y guardar** — nombre, cargo, teléfono, WhatsApp, Instagram,
   descripción, plantilla **Moderna (B)** → "Guardar" → *"Cambios
   guardados."*.
4. **Ver tarjeta pública** — el link `Ver mi tarjeta pública` abre
   `/t/<slug>`: aparecen el nombre y la descripción recién guardados, y el
   fondo confirmado por CSS computado es exactamente el degradado de la
   plantilla B (`linear-gradient(150deg, rgb(106,92,255) 0%, rgb(155,77,255)
   42%, rgb(255,92,138) 100%)` — corresponde a `#6a5cff`/`#9b4dff`/`#ff5c8a`).
5. **Volver al panel** — la tarjeta aparece en la lista con su
   nombre/estado/plantilla.
6. **Seguridad** — un segundo usuario autenticado pide
   `GET /api/tarjetas/<id del primero>/` → **404** `{"ok":false,"error":"Tarjeta
   no encontrada"}`; `PATCH` con el mismo id → también **404**, sin cambiar
   nada.
7. **Límite de 3** — el segundo usuario crea 3 tarjetas (`201` las tres) y
   la 4ª → **400** `{"ok":false,"error":"Cada cliente puede tener como
   máximo 3 tarjetas."}`.
8. **`npm run build`** — sin errores (`dist/assets/index-*.css` 18.16 kB,
   `index-*.js` 218.24 kB).

`manage.py check` (tarjeta-digital): `System check identified no issues
(0 silenced)`. No hizo falta migración — no se tocó ningún modelo.

---

## Archivos creados/modificados

- `backend/apps/cuentas/auth.py` (nuevo)
- `backend/apps/tarjetas/panel_views.py` (nuevo)
- `backend/apps/tarjetas/serializers.py` (modificado — `MisTarjetasSerializer`,
  `TarjetaPanelSerializer`)
- `backend/config/urls.py` (modificado — 3 rutas nuevas)
- `frontend/src/api/cliente.js` (nuevo)
- `frontend/src/api/tarjetas.js` (nuevo)
- `frontend/src/constants/tarjetas.js` (nuevo)
- `frontend/src/context/AuthContext.jsx` (modificado — usa el `llamarApi`
  compartido, mismo comportamiento)
- `frontend/src/pages/Panel.jsx` (reemplazado)
- `frontend/src/pages/TarjetaEditor.jsx` (nuevo)
- `frontend/src/App.jsx` (modificado — ruta `/panel/tarjeta/:id`)
- `reportes/PANEL_1.md` (este archivo)

## Pendiente (fuera de esta tarea)

- **Panel-2**: subida de foto (`imagen`) — cajas "próximamente" ya
  marcadas con `// TODO Panel-2` en el formulario y en
  `CAMPOS_EDITABLES`/`TarjetaPanelSerializer`.
- **Panel-3**: gestión de productos — misma marca `// TODO Panel-3`.
- Edición manual del slug (hoy estable a propósito, no se toca al cambiar
  `nombre_mostrado`) — `// TODO` en `panel_views.py`.
- Selección de plan / cobro con Terras al crear una tarjeta — hoy
  `plan='kabymur_basico'` fijo, sin flujo de precios.
- Sincronizar `Cliente.nombre`/`email` con Banexa en cada login (hoy es
  snapshot del primer login) si en algún momento se muestran en algún
  lado.
