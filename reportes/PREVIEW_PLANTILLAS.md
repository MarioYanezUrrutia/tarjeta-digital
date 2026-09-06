# Vista previa visual del selector de plantillas

## Objetivo
Reemplazar el selector de texto (nombre + descripción) de la sección "Plantilla"
en el editor de tarjeta (`/panel/tarjeta/:id`) por mini-vistas previas visuales
de cada plantilla (A elegante, B moderna, C link-in-bio), con el look real de
cada una, para que el usuario elija con confianza.

## Cambios

- **`frontend/src/plantillas/MiniPreviewPlantilla.jsx`** (nuevo): miniatura
  (~140px) que reutiliza literalmente los tokens de color/fondo/forma de botón
  de `PlantillaA/B/C.jsx` (blanco + borde fino en A, degradado violeta→rosa +
  píldoras translúcidas en B, fondo oscuro + botones sólidos en C). Muestra un
  avatar con iniciales ("AB"), nombre/cargo de ejemplo ("Ana Bravo" /
  "Diseñadora") y 3 botones de muestra ("WhatsApp", "Instagram", "Sitio web").
  Todos los datos son fijos, no del usuario.

- **`frontend/src/pages/TarjetaEditor.jsx`**: la sección "Plantilla" ahora
  renderiza las 3 mini-previews en fila (con wrap a columna en pantallas
  angostas), cada una con su nombre debajo (Elegante / Moderna / Link en bio).
  La plantilla seleccionada se resalta con un anillo (`ring-2 ring-gray-900
  ring-offset-2`). Al hacer clic se llama al mismo `actualizar('plantilla', ...)`
  que ya existía — el guardado (`PATCH`) no cambió.

## Verificación

1. **Estilo real de cada mini-preview**: confirmado visualmente (capturas
   headless de un harness temporal aislado que montaba el mismo bloque de
   selector) — C con fondo oscuro y acento turquesa, A blanca con bordes
   sutiles, B con degradado violeta-rosa y botones tipo píldora. Coincide con
   los estilos reales de `PlantillaA/B/C.jsx`.
2. **Selección y resalte**: al cambiar la plantilla seleccionada, el anillo de
   resalte se mueve a la miniatura correspondiente (verificado moviendo la
   selección de C a A). El mecanismo de clic usa el mismo handler que ya
   actualizaba el campo `plantilla` del formulario.
3. **Guardado**: no se modificó la lógica de guardado (`onGuardar` /
   `actualizarTarjeta`); sigue enviando el valor `A`/`B`/`C` tal cual.
4. **Build**: `npm run build` en `frontend/` compila sin errores (solo
   warnings preexistentes de `react-router` sobre "use client", no
   relacionados con este cambio).

## Notas
El harness de verificación visual fue temporal (ruta de desarrollo +
componente de prueba) y se removió por completo antes del commit; no queda
ningún archivo de QA en el repositorio.
