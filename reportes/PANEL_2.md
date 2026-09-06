# Panel-2 — Foto/logo de la tarjeta + avatar más grande

## Parte 1 — Backend: procesamiento de imagen

- **`backend/apps/tarjetas/imagenes.py`** (nuevo): adaptado de
  `_procesar_foto_perfil` de Banexa (bot_ia,
  `backend/apps/api/perfil_views.py`), con dos ajustes para tarjeta-digital:
  - `IMAGEN_LADO_MAXIMO_PX = 600` (vs. 500 en Banexa — la tarjeta ahora
    muestra la foto más grande, 160px en pantalla, y se prefiere algo de
    margen para pantallas de alta densidad).
  - El límite de compresión apunta directo a `IMAGEN_PESO_OBJETIVO_BYTES =
    300 * 1024` (`buffer.tell() > IMAGEN_PESO_OBJETIVO_BYTES`, sin el margen
    de `*1.5` que usa Banexa) — el pedido explícito era "apuntando a
    <=300KB", así que se ajustó el umbral del loop para cumplirlo directo en
    vez de solo acercarse.
  - `_recortar_al_centro`, aplanado sobre fondo blanco, e iteración de
    calidad JPG (85 → baja de 10 en 10 hasta 30) son igual que Banexa.
  - Pillow se importa **dentro** de `procesar_imagen_tarjeta` (lazy import),
    nunca a nivel de módulo — mismo motivo que en Banexa: un import de
    Pillow a nivel de módulo arrastra numpy en cada arranque del proceso.
  - Si `archivo` no es una imagen válida o está corrupta, la función deja
    pasar la excepción de Pillow tal cual (no la atrapa) — el llamador
    (`panel_views.tarjeta_detalle`) es quien la traduce a un 400 claro.

- **`backend/apps/tarjetas/panel_views.py`** — `tarjeta_detalle` (PATCH):
  - Nuevo bloque antes del loop de `CAMPOS_EDITABLES`: si `request.FILES`
    trae `'imagen'`, valida tamaño (<=5MB), procesa con
    `procesar_imagen_tarjeta`, borra el archivo físico anterior
    (`tarjeta.imagen.delete(save=False)`) y guarda el nuevo con nombre
    estable `tarjeta_<id>.jpg` — mismo patrón de reemplazo que
    `subir_foto_perfil` en Banexa, para no acumular archivos.
  - Un PATCH sin archivo (JSON o multipart sin campo `imagen`) no toca la
    imagen para nada — `request.FILES.get('imagen')` da `None` y el bloque
    se salta completo.
  - **Hallazgo no obvio, corregido**: cuando el PATCH es multipart (porque
    trae una imagen), los flags booleanos (`mostrar_contacto`, etc.) llegan
    como el string `'true'`/`'false'` en minúscula — así los serializa
    `FormData` de un booleano de JS — y `BooleanField.to_python` de Django
    **no** acepta esa grafía (solo `'True'`/`'1'`/`'t'` o
    `'False'`/`'0'`/`'f'`), así que guardar un flag junto con una imagen
    habría tirado un 400 de validación. Se agregó `_coerce_valor_campo` (con
    el set `CAMPOS_BOOLEANOS`) que normaliza esos strings antes del
    `setattr`, para el PATCH JSON (donde ya llegan como `bool` real) y el
    multipart por igual.
  - No se agregó `imagen` a `CAMPOS_EDITABLES`: llega por `request.FILES`,
    no por el body de texto, así que se maneja aparte.
  - `resolver_perfil_banexa(request)` sigue siendo el primer paso — la
    verificación de que la tarjeta es del usuario autenticado no cambió.

- **`backend/apps/tarjetas/serializers.py`** — `TarjetaPanelSerializer`
  ahora incluye `'imagen'` (de solo lectura — no se edita por este
  serializer, solo se lee para precargar el editor y para la respuesta del
  PATCH). `TarjetaPublicaSerializer` ya incluía `'imagen'` desde antes.

- **Media en dev**: ya estaba resuelto en el esqueleto —
  `config/urls.py` sirve `MEDIA_URL`/`MEDIA_ROOT` cuando `DEBUG=True`.
  `TarjetaPublicaView` ya pasaba `context={'request': request}` al
  serializer, así que `imagen` sale como URL absoluta
  (`http://localhost:8010/media/tarjetas/tarjeta_<id>.jpg`). Se agregó el
  mismo `context={'request': request}` a los dos usos de
  `TarjetaPanelSerializer` en `tarjeta_detalle` (GET y respuesta del PATCH),
  que antes no lo tenían — sin esto, la URL de imagen que ve el editor
  hubiera salido relativa (`/media/...`), inútil desde el origen `:5173`.

## Parte 2 — Frontend: subir imagen en el editor

- **`frontend/src/api/cliente.js`** — `llamarApi` ahora detecta si
  `options.body instanceof FormData`: si es así, no fuerza
  `Content-Type: application/json` (deja que el navegador arme el boundary
  del multipart) — mismo patrón que `api.js` de `portal_banexa`.
- **`frontend/src/api/tarjetas.js`** — `actualizarTarjeta(id, campos)` ahora
  manda `campos` tal cual si ya es un `FormData`, o `JSON.stringify(campos)`
  si es un objeto plano (comportamiento anterior, sin cambios).
- **`frontend/src/pages/TarjetaEditor.jsx`**:
  - Reemplazada la caja "Foto de perfil — próximamente" por un control real:
    círculo (imagen actual, vista previa local, o iniciales si no hay nada)
    + botón "Elegir foto"/"Elegir logo" (según `tipo`) que abre un
    `<input type="file" accept="image/*">` oculto.
  - `onElegirImagen`: valida en cliente que sea imagen y <=5MB (mensaje de
    error si no cumple); si pasa, genera una vista previa local con
    `URL.createObjectURL` y guarda el `File` en estado — **no sube nada
    todavía**.
  - `onGuardar`: si hay un archivo elegido pendiente, arma un `FormData`
    (todos los campos de `CAMPOS_A_GUARDAR` + el archivo bajo la clave
    `'imagen'`) y lo manda por `actualizarTarjeta`; si no hay archivo nuevo,
    sigue mandando JSON exactamente como antes.
  - Tras un guardado exitoso: la URL de imagen del estado se actualiza con
    la que devuelve el backend (ya procesada), se libera el
    `URL.createObjectURL` de la vista previa (`URL.revokeObjectURL`) y se
    limpia el archivo pendiente — el círculo pasa a mostrar la imagen real
    guardada.
  - Al cargar el editor (`GET /api/tarjetas/<id>/`), se precarga `imagenUrl`
    con `datos.imagen` (ahora presente gracias al cambio de serializer).

## Parte 3 — Avatar más grande

Avatar (imagen o iniciales) agrandado de `h-32 w-32` (128px, de la tarea
anterior) a **`h-40 w-40` (160px)** en las 3 plantillas — el `+20%` pedido da
~154px exactos; entre las dos clases de Tailwind cercanas (`h-36`=144px,
`h-40`=160px), se eligió **160px** por quedar dentro del rango "~150-160px"
sugerido y verse mejor proporcionado a este tamaño en las capturas de
verificación (más "foto de perfil", menos "ícono"). Texto de iniciales subido
de `text-3xl` a `text-4xl` para mantener la proporción. Sigue centrado y no
rompe el layout en un viewport de 420px de ancho (probado).

## Verificación

**Backend (probado contra la vista real, no una reimplementación)**: no fue
posible loguearse como un usuario real de Banexa desde este entorno (no hay
credenciales disponibles), así que se armó un script de QA que invoca
`panel_views.tarjeta_detalle` directamente con requests multipart/JSON reales
construidos con `rest_framework.test.APIRequestFactory` (mismo mecanismo que
usan los tests de DRF), sobre una tarjeta de prueba temporal, con la
autenticación de Banexa reemplazada en memoria por un resolver falso que
apunta al cliente de prueba (nada de esto toca el disco ni queda en el
código — vive solo en el proceso del script). Resultados:

1. PATCH multipart con texto + flag `mostrar_contacto='False'` (string, como
   lo manda `FormData`) + imagen → 200; el flag se guardó como `False` real
   (confirma el fix de `_coerce_valor_campo`); la imagen se guardó en
   `media/tarjetas/tarjeta_<id>.jpg`, **600×600 (cuadrada), JPEG, 263 384
   bytes (<=300KB)**.
2. Segunda imagen distinta sobre la misma tarjeta → mismo nombre de archivo
   físico, y solo hay **1** archivo `tarjeta_<id>.*` en el directorio tras el
   reemplazo (no se acumulan).
3. PATCH solo-texto (JSON, sin `imagen`) → 200, el campo de texto se
   actualiza y la URL de imagen no cambia.
4. PATCH con un archivo `.txt` (no imagen) → **400** con
   `{"error": "El archivo no es una imagen válida."}`, la imagen existente no
   se toca.
5. Tarjeta recién creada sin imagen → `TarjetaPublicaSerializer` devuelve
   `imagen: None`.

**Frontend / página pública (navegador real, Edge headless)**: se creó una
tarjeta de prueba temporal con una imagen ya procesada (mismo mecanismo que
usa el backend) y se visitó `/t/<slug>` en las 3 plantillas:

- **Plantilla A, B y C**: la imagen se muestra en el círculo de 160px (en vez
  de las iniciales), recortada a cuadrado/círculo, centrada, sin romper el
  layout en un viewport de 420px.
- **Tarjeta sin imagen**: sigue mostrando las iniciales ("SI"), ya al tamaño
  nuevo de 160px.

Al terminar cada verificación se borraron los clientes/tarjetas de prueba
(cascada) y los archivos físicos que quedaron en `backend/media/tarjetas/` —
no quedó ningún dato ni archivo de QA.

**No verificado con clic real en el navegador** (por falta de credenciales de
Banexa para entrar al editor protegido): la interacción de elegir un archivo
en `<input type="file">` y ver la vista previa local antes de guardar. La
lógica (`URL.createObjectURL` + estado de React + armado de `FormData`) sigue
el mismo patrón ya usado y probado en Banexa/portal_banexa, y quedó verificada
por revisión de código; no se pudo ejercer con un clic real de principio a
fin.

## Build

`npm run build` en `frontend/` compila sin errores (solo warnings
preexistentes de `react-router`, no relacionados). `python manage.py check`
en `backend/` no reporta issues.

## Notas

No se subió `.env`/`.env.local` (siguen en `.gitignore`). `backend/media/`
está gitignored (patrón `media/` en `.gitignore`, sin slash inicial → aplica
a cualquier profundidad) y no aparece en `git status`; se confirmó además que
no quedó ningún archivo de imagen de prueba en disco tras la verificación.
