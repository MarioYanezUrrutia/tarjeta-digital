# Ajustes: foto arriba + QR de la tarjeta

## Ajuste 1 — Foto de perfil arriba, centrada (editor)

- **`frontend/src/pages/TarjetaEditor.jsx`**: el control de imagen (círculo +
  botón "Elegir foto"/"Elegir logo") se sacó de dentro de la `Seccion
  "Identidad"` y se movió a una tarjeta propia, centrada, justo antes de las
  secciones de campos (después del header/estado/aviso de pago, que son
  chrome de la página, no un campo del formulario).
- El círculo se agrandó de 80px (`h-20 w-20`) a 112px (`h-28 w-28`) para que
  se vea prominente, con un label ("Foto de perfil"/"Logo") arriba y el
  botón de elegir archivo debajo, todo centrado horizontalmente.
- La lógica de subida no cambió para nada: mismo `onElegirImagen`, misma
  vista previa con `URL.createObjectURL`, mismo envío en `onGuardar` — solo
  se movió el JSX, ningún handler se tocó.
- Las plantillas públicas (`PlantillaA/B/C.jsx`) no se tocaron.

## Ajuste 2 — Código QR de la tarjeta (editor)

- **Librería elegida: `qrcode`** (la API imperativa `QRCode.toCanvas`/
  `QRCode.toDataURL`, no `qrcode.react`) — se necesitaban dos resoluciones
  distintas del mismo QR (pantalla ~200px, descarga 512px) y la API
  imperativa deja fijar el tamaño exacto en cada llamada sin depender de un
  componente montado en el DOM a otro tamaño.
- **`frontend/.env` / `.env.example`**: nueva variable
  `VITE_PUBLIC_BASE_URL` (dev: `http://localhost:5173`; en producción, el
  dominio real). Si no está configurada, se usa `window.location.origin`
  como respaldo (nunca rompe, aunque en dev sin la variable coincide con
  localhost de todas formas).
- **`frontend/src/components/CompartirTarjeta.jsx`** (nuevo): arma
  `url = ${VITE_PUBLIC_BASE_URL}/t/${slug}`, renderiza el QR en un
  `<canvas>` de 200px con `QRCode.toCanvas`, muestra la URL en texto, y dos
  botones:
  - **"Copiar enlace"**: `navigator.clipboard.writeText(url)` (la API
    estándar del navegador); si falla (clipboard no disponible), el enlace
    sigue visible en texto para copiar a mano — no rompe nada.
  - **"Descargar QR"**: genera un QR aparte a 512×512 con
    `QRCode.toDataURL(url, {width: 512})` y dispara la descarga como
    `qr-<slug>.png` vía un `<a download>` temporal.
  - Si `estado === 'borrador'`, se muestra la nota "Tu tarjeta se verá
    cuando la actives." (opcional, se agregó).
- **`TarjetaEditor.jsx`**: nueva `Seccion titulo="Comparte tu tarjeta"` al
  final del formulario (después de "Plantilla"), que renderiza
  `<CompartirTarjeta slug={slug} estado={estado} />`.

## Verificación

**QR — correctitud del contenido (generación + decodificación
independientes, sin depender de la app)**: se generó un QR con la misma
librería y las mismas dos resoluciones que usa el componente (200px y
512px) para una URL de prueba, y se decodificó con un decodificador QR
independiente (`jsQR` + `pngjs`, instalados aparte en una carpeta temporal,
no en el proyecto) — **el contenido decodificado coincidió exactamente con
la URL esperada en ambas resoluciones**.

**Editor real, con clic real** (sesión real inyectada vía Chrome DevTools
Protocol sobre la tarjeta real y activa del usuario `mario`, slug
`tarjeta-9`, sin modificar sus datos):

1. **Foto arriba y centrada, funcionando**: se vio la foto real del usuario
   en el círculo de 112px, en su propia tarjeta al tope del formulario,
   antes de "Identidad" — confirmado visualmente con la tarjeta real (no
   una de prueba).
2. **QR visible con la URL correcta**: la sección "Comparte tu tarjeta"
   mostró el QR y el texto `http://localhost:5173/t/tarjeta-9` — coincide
   exactamente con `${VITE_PUBLIC_BASE_URL}/t/<slug>` de esa tarjeta.
3. **"Descargar QR" con clic real**: se interceptó el evento real de
   descarga del navegador (`Page.downloadWillBegin`) disparado por el clic
   — confirmó **`suggestedFilename: "qr-tarjeta-9.png"`** (nombre
   `qr-<slug>.png` correcto) y entregó el PNG completo, que se decodificó
   aparte: **512×512 px reales**, 8792 bytes — la resolución de descarga
   pedida, más grande que el QR en pantalla (200px), apta para imprimir.
4. **"Copiar enlace"**: implementado con la API estándar
   `navigator.clipboard.writeText` (el patrón universal para esta función).
   **No se pudo confirmar por script** que el texto quedó en el portapapeles
   real: Chrome headless bajo automatización deniega el permiso de
   clipboard incluso trayendo la pestaña al frente y con un clic real
   ("Write permission denied") — es una restricción del entorno de
   automatización, no del código (la función usa el mismo patrón que
   cualquier botón "copiar" de la web, con `try/catch` para no romper nada
   si el navegador la bloquea, dejando siempre la URL visible como
   respaldo). Recomiendo al usuario confirmar este botón con un clic manual
   en su navegador normal.

**Build**: `npm run build` en `frontend/` compila sin errores (mismos
warnings preexistentes de `react-router`/`@react-oauth`, no relacionados).

## Notas

No se subió `.env`. Los 3 servicios (Banexa `:8000`, backend `:8010`,
frontend `:5173`) se dejaron corriendo — el usuario los había levantado para
probar manualmente y pidió avisar cuando estuviera listo, así que no se
detuvieron al terminar esta verificación.
