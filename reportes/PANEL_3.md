# Panel-3 — Gestión de productos de la tarjeta

## Parte 1 — Backend: endpoints de productos

- **`backend/apps/tarjetas/productos_views.py`** (nuevo):
  - `GET/POST /api/tarjetas/<tarjeta_id>/productos/` — lista (ordenada por
    `orden`, que ya era el `Meta.ordering` del modelo) o crea un producto.
  - `PATCH/DELETE /api/productos/<producto_id>/` — edita o borra un producto.
  - `POST /api/tarjetas/<tarjeta_id>/productos/reordenar/` — recibe
    `{"orden": [id1, id2, ...]}` y reasigna el campo `orden` de cada producto
    según su posición en la lista, con `bulk_update`. Todo o nada: si la
    lista no coincide exactamente con los productos de esa tarjeta, no toca
    ninguno (400).
  - `MAX_PRODUCTOS_POR_TARJETA = 20` — constante única al tope del archivo,
    provisional hasta que exista el flujo de planes/tiers.
  - Reutiliza `procesar_imagen_tarjeta` de Panel-2 (`imagenes.py`) para las
    fotos de producto — mismo recorte cuadrado, mismo tope <=300KB, mismo
    lazy import de Pillow. Nombre de archivo estable `producto_<id>.jpg`,
    con el mismo patrón de reemplazo (borra el archivo físico anterior antes
    de guardar el nuevo) que ya usa la imagen de la tarjeta.
  - Seguridad: `_obtener_tarjeta_o_404` / `_obtener_producto_o_404` verifican
    `resolver_perfil_banexa` + que la tarjeta (o la tarjeta del producto) sea
    del `Cliente` del usuario autenticado — 404 sin distinguir "no existe" de
    "no es tuyo", mismo criterio que `panel_views.py`.
  - `orden` al crear: `(orden_máximo_actual or 0) + 1` — siempre al final;
    `imagen` no se agrega a ningún "CAMPOS_EDITABLES" porque llega por
    `request.FILES`, igual que en la tarjeta.

- **`backend/apps/tarjetas/serializers.py`** — `ProductoSerializer` nuevo
  (`id`, `imagen` de solo lectura, `nombre`, `caracteristicas`, `detalle`,
  `orden` de solo lectura). `ProductoPublicoSerializer` (página pública) no
  se tocó.

- **`backend/config/urls.py`** — 3 rutas nuevas registradas.

No hizo falta ninguna migración: `Producto` ya existía completo desde la
Fase A.1 (imagen opcional, `null=True, blank=True`).

## Parte 2 — Frontend: gestión de productos en el editor

- **`frontend/src/api/productos.js`** (nuevo): `obtenerProductos`,
  `crearProducto`, `actualizarProducto`, `borrarProducto`,
  `reordenarProductos` — mismo patrón que `api/tarjetas.js` (FormData cuando
  hay imagen, JSON si no).
- **`frontend/src/components/GestionProductos.jsx`** (nuevo): reemplaza la
  caja "Catálogo de productos — próximamente" en `TarjetaEditor.jsx`.
  - Carga los productos de la tarjeta al montar (`GET`).
  - Lista cada producto: imagen (o placeholder "Sin foto"), nombre,
    características, y 4 botones de ícono (SVG inline, mismo estilo que los
    íconos de contacto/redes de las plantillas): subir, bajar, editar,
    borrar — con `aria-label` para accesibilidad.
  - "Agregar producto" abre un formulario inline (nombre, características,
    detalle, imagen con vista previa local vía `URL.createObjectURL`, mismo
    patrón que la foto de la tarjeta en Panel-2). "Editar" abre el mismo
    formulario precargado.
  - Guardar: si hay imagen nueva elegida, arma `FormData`; si no, manda JSON.
    Crea (`POST`) o edita (`PATCH`) según corresponda.
  - Borrar pide confirmación con `window.confirm`.
  - Reordenar (↑/↓): actualiza la lista local de forma optimista y llama a
    `reordenarProductos`; si falla, revierte al orden anterior.
  - Muestra "N de 20 productos" y deshabilita "Agregar producto" al llegar
    al límite.

- **¿La gestión de productos guarda independiente del "Guardar" general de
  la tarjeta? Sí.** Cada alta/edición/borrado/reorden de producto es su
  propia llamada a la API (`POST`/`PATCH`/`DELETE` a los endpoints de
  productos) en el momento en que ocurre — no pasa por `CAMPOS_A_GUARDAR` ni
  por el botón "Guardar" del formulario de la tarjeta, y no se ve afectada
  si el usuario no presiona ese botón.

## Un bug real encontrado y corregido durante la verificación

Al revisar el diseño original (fila con botones de texto "↑ ↓ Editar
Borrar"), una primera tanda de capturas a 390px de ancho sugería que esos
botones desbordaban horizontalmente la tarjeta en pantallas angostas. Se
reemplazaron por botones de ícono compactos (héxaedros de 32×32px, SVG
inline) — una mejora real y ya aplicada, más compacta y consistente con el
resto de la app.

Al investigar a fondo con Chrome DevTools Protocol (`Emulation.
setDeviceMetricsOverride`, midiendo `getBoundingClientRect()` real) se
confirmó que el motivo de esas capturas iniciales NO era un bug de layout:
la herramienta de captura usada (`msedge --headless --window-size=... 
--screenshot`) no estaba respetando `--window-size` para el viewport real
(`window.innerWidth` resultaba 492px sin importar qué ancho se pidiera), así
que esas capturas "angostas" eran en realidad recortes de una página
renderizada más ancha, no la página realmente reflowada a 390px. Verificado
con el viewport real forzado por CDP: el diseño original con texto también
truncaba y ordenaba bien. De todos modos se mantienen los botones de ícono
porque son una mejora legítima (más compactos, más iconografía consistente
con el resto de la tarjeta), no una reversión.

## Verificación

**Backend (vista real, no reimplementada)**: sin credenciales de Banexa
disponibles para loguearse por el navegador, se probaron las vistas reales
(`productos_views.productos_lista`, `producto_detalle`,
`productos_reordenar`) con requests multipart/JSON construidos con
`rest_framework.test.APIRequestFactory`, sobre tarjetas de prueba
temporales, con `resolver_perfil_banexa` reemplazado en memoria por un
resolver falso (nada de esto persiste ni queda en el código). Resultados:

1. **Crear con imagen** → 201; imagen procesada 600×600 cuadrada, JPEG,
   **192 723 bytes (<=300KB)**; `orden` asignado al final.
2. **Crear sin imagen** → 201; `imagen: None`.
3. **Editar (nombre + imagen nueva)** → 200; el archivo anterior se
   reemplaza (mismo nombre físico, sigue habiendo solo 1 archivo para ese
   producto — no se acumulan).
4. **Reordenar** → 200; el nuevo orden se persiste correctamente
   (verificado releyendo de la base).
5. **Borrar** → 204; el registro desaparece de la base **y** el archivo
   físico de su imagen se borra del disco.
6. **Página pública**: `TarjetaPublicaSerializer` devuelve los productos en
   el orden correcto, y `[]` cuando `mostrar_productos=False`.
7. **Límite de 20**: con 20 productos ya creados, el intento de crear el
   21° → 400 con `"Ya alcanzaste el máximo de 20 productos."`.
8. **Seguridad**: un segundo usuario (cliente distinto) probando GET/PATCH/
   DELETE sobre la tarjeta o un producto del primer usuario → 404 en los
   tres casos; el producto ajeno queda intacto.

**Frontend / página pública (navegador real, capturas)**: se creó una
tarjeta de prueba con 3 productos (2 con imagen, 1 sin imagen, en un orden
definido) y se visitó `/t/<slug>` en las 3 plantillas — los productos
aparecen en el orden correcto, con y sin imagen, en A, B y C.

**Editor (layout, con viewport real verificado por CDP)**: se armó una
réplica visual de `GestionProductos` para revisar estética/mobile-first sin
necesitar sesión de Banexa (la página real está protegida y no hay
credenciales disponibles). A un viewport de 390px real (confirmado con
`window.innerWidth`, no solo el flag de la herramienta de captura) el header
("N de 20 productos" + "Agregar producto"), la lista de productos (imagen,
nombre truncado, características, 4 botones de ícono) y el formulario
"Nuevo producto" (con clic real disparado vía CDP) se ven completos, sin
desbordes, con espacio de sobra.

**No verificado con clic real de guardar/editar/borrar/reordenar contra el
backend real** (mismo límite que Panel-2: el editor está protegido por
sesión de Banexa y no hay credenciales disponibles en este entorno). Esa
lógica de interacción sigue el mismo patrón ya usado en Panel-2 (FormData,
`URL.createObjectURL`, actualización optimista) y su contraparte de API fue
probada exhaustivamente contra la vista real del backend (arriba).

## Build

`npm run build` en `frontend/` compila sin errores (solo warnings
preexistentes de `react-router`). `python manage.py check` en `backend/` no
reporta issues.

## Notas

No se subió `.env`/`.env.local`. `backend/media/` sigue gitignored y no
quedó ningún archivo de imagen de prueba en disco tras la verificación. La
dependencia `websocket-client` usada solo para el diagnóstico por CDP se
desinstaló del venv de `backend/` al terminar — no quedó en
`requirements.txt` ni se usó en ningún momento en el código de producción.
