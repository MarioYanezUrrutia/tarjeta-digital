# Plantillas Pro — Tanda 1 (Serena, Confianza, Vacío, Revista)

## Qué se hizo

**Backend**
- `Tarjeta.plantilla`: choices nuevos `serena`, `confianza`, `vacio`, `revista` (`models.py`).
- Migración `0015_plantillas_tanda1` (solo `AlterField` de choices; no cambia el esquema).

**Frontend** (`frontend/src/plantillas/pro/`)
- `PlantillaSerena.jsx`, `PlantillaConfianza.jsx`, `PlantillaVacio.jsx`, `PlantillaRevista.jsx`: un componente por plantilla, cada uno con su layout. `PlantillaProBase` y `temas.js` no se tocaron.
- `tanda1.css`: estilos portados de la referencia, acotados por clase raíz (`.serena`, `.confianza`, `.vacio`, `.revista`), mobile first.
- `tanda1Comun.jsx`: piezas compartidas — noticias, testimonios, FAQ (heredan colores/tipografía de la clase raíz), firma "Hecho con Kabymur" y helpers.
- `PlantillaProSelector.jsx`: reconoce las 4 claves; el resto sigue igual (fallback `PlantillaProBase`).
- Selector del editor: `PLANTILLAS_PRO_DISPONIBLES`, `PLANTILLA_LABEL` y miniaturas (`MiniPreviewPlantilla.jsx`) con las 4 nuevas.
- Fuentes: un solo `@import` central en `src/index.css` (se agregaron Space Grotesk, JetBrains Mono, Fraunces itálica/900, Playfair itálica, Inter 800/900, Plex 300/700). Los pesos nuevos son superconjunto de los anteriores.
- `.gitignore`: `frontend/.referencia-tanda1.html*`.

## Verificación

- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check`: sin cambios pendientes (tras crear la 0015).
- `pnpm build`: sin errores.
- Revisión visual a 390 px de ancho con tres juegos de datos (completos, `demo-pro`, mínimos) en una página temporal ya eliminada. Con datos mínimos no aparece texto de relleno: los bloques se ocultan.

## Campos que NO existen en el modelo (decisiones a confirmar)

1. **Precio de producto.** `Producto` solo tiene `nombre`, `caracteristicas` y `detalle`. Regla aplicada: `caracteristicas` = descripción; `detalle` corto (≤ 24 caracteres, ej. "Desde $25.000") ocupa el lugar del precio; `detalle` largo se muestra como texto. Si se quiere precio de verdad, hay que agregar un campo.
2. **Año del trabajo (Vacío).** No existe; cada ítem muestra su número de orden.
3. **Estadísticas de Confianza** ("600+ familias", "4.9 estrellas") y **"24/7"** de la referencia eran contenido de ejemplo, no campos: no se muestran. El bloque oscuro de confianza usa el primer testimonio, si existe.
4. **"En línea"** (Confianza) se reemplazó por un botón "Llamar" que solo aparece si hay teléfono.
5. **Fecha del masthead (Revista):** mes y año actuales (sin "Nº 024").

## Cómo se vería con los datos de `demo-pro` (id 38, "Estudio Aura")

La landing 18 no existe en la base de desarrollo y no se consulta producción; se usó `demo-pro` como equivalente. **Falta revisar con la 18 real.**

- **Serena:** eyebrow "Estudio de Pilates y bienestar", nombre en cursiva con el eslogan debajo, botón WhatsApp, arco decorativo (sin foto), sobre en panel rosado y 3 tarjetas de plan sin precio (su `detalle` está vacío).
- **Confianza:** logo "E" naranja, titular con el eslogan (sin coma, queda todo en un color), WhatsApp directo, sin barra de zonas (la dirección no trae comas), planes sin precio, testimonio en bloque azul.
- **Vacío:** nombre con "Aura" en rosa y cursor, sobre numerado 01, planes en grilla con línea fina, contacto con hola@estudioaura.cl e Instagram.
- **Revista:** masthead "ESTUDIO AURA · OCT 2026", titular con el eslogan, sobre en columnas con capitular, planes numerados 01–03 sin meta y cita final con el primer testimonio.
