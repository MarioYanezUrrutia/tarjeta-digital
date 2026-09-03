# Fase A.2 — Página pública de la tarjeta (plantilla C)

Fecha: 2026-09-02

Objetivo: al entrar a `/t/<slug>`, ver la página pública de una Tarjeta con
datos reales del backend, respetando los flags de visibilidad que definió el
cliente. Solo se implementó la plantilla C (link-in-bio); el código queda
preparado para agregar A y B más adelante sin reescribir la lógica de datos.

## Parte 1 — Backend

Archivos nuevos/modificados en `backend/apps/tarjetas/`:

- `serializers.py` (nuevo):
  - `ProductoPublicoSerializer`: expone `nombre`, `imagen` (URL absoluta vía
    `ImageField(use_url=True)` + contexto de `request`), `caracteristicas`,
    `detalle`, `orden`.
  - `TarjetaPublicaSerializer`: expone solo los campos necesarios para la
    página pública (identidad, contacto, redes, sobre, ubicación, flags
    `mostrar_*`). **No** expone `id`, `cliente`, `estado` interno ni
    `banexa_user_id` — nada del cliente ni datos administrativos.
  - El campo `productos` es un `SerializerMethodField`: si
    `mostrar_productos` es `False`, devuelve `[]` sin tocar la base de datos
    de más; si es `True`, serializa los productos reales de la tarjeta.

- `views.py` (modificado): se agregó `TarjetaPublicaView` (`APIView`,
  `permission_classes = [AllowAny]`):
  - `GET /api/t/<slug>/`
  - Busca la `Tarjeta` por `slug`. Si no existe → `404` con
    `{"error": "Tarjeta no encontrada"}`.
  - Si existe pero su `estado` no es `activa`, por ahora se devuelve igual
    (queda `// TODO: validar estado activo/no vencida cuando exista
    suscripción` en el código, para no bloquear pruebas antes de que exista
    el modelo de suscripción).
  - Devuelve `TarjetaPublicaSerializer` con `context={'request': request}`
    para que las URLs de imagen salgan absolutas.

- `backend/config/urls.py` (modificado): se registró la ruta
  `path('api/t/<slug:slug>/', TarjetaPublicaView.as_view(), name='tarjeta-publica')`.
  También se agregó el servido de `MEDIA_URL` en modo `DEBUG` (no existía),
  necesario para poder ver imágenes de tarjeta/producto en desarrollo.

## Parte 2 — Frontend

- Se instaló `react-router-dom` (`frontend/package.json`,
  `frontend/package-lock.json`).
- `frontend/src/main.jsx`: envuelve `<App />` en `<BrowserRouter>`.
- `frontend/src/App.jsx`: ahora define rutas con `<Routes>`:
  - `/` → `pages/Home.jsx` (el health-check que antes vivía en `App.jsx`, se
    movió sin cambios de lógica).
  - `/t/:slug` → `pages/TarjetaPublica.jsx`.
- `frontend/src/pages/TarjetaPublica.jsx`: **lógica de datos**, separada de
  la piel visual:
  - Lee `slug` de la URL con `useParams`.
  - Hace `fetch` a `${VITE_API_BASE}/t/<slug>/`.
  - Maneja tres estados: `cargando` (spinner), `error` (404 → mensaje "Esta
    tarjeta no existe o no está disponible."), `listo`.
  - Al tener los datos, elige el componente de plantilla con
    `getPlantilla(tarjeta.plantilla)` y le pasa `tarjeta` como prop. No sabe
    nada de cómo se ve cada plantilla.
- `frontend/src/plantillas/index.js`: mapa `{ nombre_plantilla: Componente }`
  usado por `getPlantilla`. Hoy solo mapea a `PlantillaC` (incluyendo el
  fallback `default`), pero agregar A/B después es solo sumar una entrada al
  mapa — no toca `TarjetaPublica.jsx`.
- `frontend/src/plantillas/PlantillaC.jsx`: la piel visual de la plantilla
  C (link-in-bio), estética `#16181f` / botones `#21242e` / acento teal
  `#2dd4bf`, mobile-first:
  - Foto redonda con borde teal, o iniciales del `nombre_mostrado` si no hay
    imagen.
  - Nombre, cargo/rubro, empresa, eslogan.
  - Botones full-width apilados con ícono, solo para campos con valor:
    WhatsApp (`wa.me`), Llamar (`tel:`), Correo (`mailto:`), Sitio web, y
    cada red social con valor. Todo el bloque de contacto respeta
    `mostrar_contacto`; el de redes respeta `mostrar_redes`.
  - Botón "Guardar contacto" como placeholder visual (`// TODO: generar y
    descargar archivo .vcf real` queda en el código — se implementa
    después).
  - Sección "Sobre mí/nosotros" si `mostrar_sobre` y hay `sobre_texto`.
  - Sección "Ubicación" si `mostrar_ubicacion` y hay dirección/horario, con
    botón "Cómo llegar" a Google Maps (`google.com/maps/search`).
  - Sección "Productos y servicios" si `mostrar_productos` y hay productos
    (la lista ya viene filtrada por el backend, pero el flag se respeta
    igual en el frontend).
- `frontend/src/plantillas/icons.jsx`: íconos SVG inline livianos (sin
  dependencia externa) para WhatsApp, teléfono, correo, sitio web, redes,
  ubicación, etc.

## Corrección encontrada durante la verificación

Al probar `/t/demo` en un navegador real, la página cargaba pero **sin casi
ningún estilo de Tailwind** (texto negro, enlaces azules subrayados, sin
padding/gap/rounded). La causa: `frontend/src/index.css` seguía usando la
sintaxis de Tailwind v3 (`@tailwind base; @tailwind components; @tailwind
utilities;`), que con Tailwind v4 no carga el theme por defecto (escala de
espaciado, colores, tamaños de fuente) — solo generaba utilidades estáticas
y de valor arbitrario (`bg-[#21242e]`, etc.), no las que dependen del theme
(`text-white`, `gap-3`, `px-4`, `rounded-xl`, `text-sm`...).

Se corrigió reemplazando por la sintaxis v4:

```css
@import "tailwindcss";
```

Verificado sirviendo el CSS compilado antes/después del cambio: pasó de
3.6 kB (sin utilidades de theme) a 11.2 kB (con ellas). Con el fix, la
página se ve como se esperaba.

## Verificación

1. Se creó/actualizó una Tarjeta de prueba en el modelo (vía shell de
   Django, no admin manual) con `slug='demo'`: nombre, cargo, empresa,
   eslogan, contacto (WhatsApp, teléfono, correo, sitio web), redes
   (Instagram, LinkedIn — Facebook/TikTok/YouTube/X vacíos a propósito),
   sobre texto, ubicación, y 2 productos. Todos los flags `mostrar_*` en
   `True`.
2. Backend levantado (`manage.py runserver 8000`):
   - `GET /api/t/demo/` → 200, JSON con los datos reales (verificado
     también que tildes/ñ se sirven correctos).
   - `GET /api/t/noexiste/` → 404, `{"error": "Tarjeta no encontrada"}`.
3. Frontend levantado (`npm run dev`) y verificado con Chrome headless
   (captura de pantalla + volcado de texto del DOM):
   - `/t/demo` muestra foto/iniciales, nombre, cargo, empresa, eslogan;
     botones de WhatsApp/Llamar/Correo/Sitio web/Instagram/LinkedIn (sin
     Facebook/TikTok/YouTube/X, que estaban vacíos); botón "Guardar
     contacto"; sección "Sobre mí"; sección "Ubicación" con botón "Cómo
     llegar"; sección "Productos y servicios" con las 2 tarjetas de
     producto.
   - Se apagaron temporalmente `mostrar_redes` y `mostrar_productos` en la
     tarjeta demo y se confirmó que esas secciones desaparecen de la
     página sin afectar el resto; luego se restauraron los flags a `True`.
   - `/t/noexiste` muestra "Esta tarjeta no existe o no está disponible."
4. `npm run build` compiló sin errores (bundle CSS 11.21 kB, JS 191.82 kB).
5. `python manage.py test apps.tarjetas` sigue en verde (no se tocó la
   lógica de modelo de la Fase A.1).

## Archivos creados/modificados

- `backend/apps/tarjetas/serializers.py` (nuevo)
- `backend/apps/tarjetas/views.py` (modificado)
- `backend/config/urls.py` (modificado)
- `frontend/package.json`, `frontend/package-lock.json` (modificado —
  `react-router-dom` agregado)
- `frontend/src/main.jsx`, `frontend/src/App.jsx` (modificados)
- `frontend/src/index.css` (modificado — fix sintaxis Tailwind v4)
- `frontend/src/pages/Home.jsx` (nuevo)
- `frontend/src/pages/TarjetaPublica.jsx` (nuevo)
- `frontend/src/plantillas/PlantillaC.jsx` (nuevo)
- `frontend/src/plantillas/icons.jsx` (nuevo)
- `frontend/src/plantillas/index.js` (nuevo)
- `reportes/FASE_A2_PAGINA_PUBLICA.md` (este archivo)

## Próximos pasos recomendados

- Validar `estado` de la tarjeta (activa/vencida) cuando exista el modelo
  de suscripción (marcado con `// TODO` en `views.py`).
- Implementar la descarga real de `.vcf` en el botón "Guardar contacto"
  (marcado con `// TODO` en `PlantillaC.jsx`).
- Agregar las plantillas A y B al mapa en `plantillas/index.js`.
