# Campos de plantillas: precio, "Desde", año y zonas de cobertura

Reemplaza los dos parches de la tanda 1: el precio que se adivinaba desde `detalle`
(si medía 24 caracteres o menos) y las zonas que se sacaban de `direccion`.

## Cambios

**Backend**
- `Producto`: `precio_clp` (entero ≥ 1 y ≤ 99.999.999, opcional), `precio_desde` (bool, por defecto False),
  `anio` (entero opcional, entre 1900 y el año actual + 1; el tope se calcula al validar).
- `Tarjeta`: `zonas_cobertura` (texto opcional, máx. 300 caracteres), agregado a `CAMPOS_EDITABLES`
  (se usa también en el primer Guardar al crear la tarjeta).
- Migración `0016_productos_precio_zonas`: solo esquema, sin migración de datos (los productos existentes quedan sin precio).
- Serializers de producto (panel y público): `precio_clp`, `precio_desde`, `anio`.
  Serializers de tarjeta (panel y público): `zonas_cobertura`.
- Validación en español en `productos_views.py` (crear y editar, JSON o multipart) y en el modelo (zonas).
  Con un dato inválido responde 400 y no guarda nada. Si se borra el precio, `precio_desde` vuelve a False.
- Admin: el inline de productos muestra los 3 campos nuevos.

**Editor**
- Producto: "Precio (opcional)" con formato es-CL mientras se escribe, casilla *Mostrar como "Desde"*;
  si es Pro, "Año (opcional)" con la ayuda "Útil para mostrar trabajos o proyectos". La lista muestra el precio.
- Ubicación (solo Pro): "Zonas o comunas que atiendes" con la ayuda pedida (tope de 300 caracteres).

**Plantillas**
- Se quitó la regla "detalle corto = precio": `detalle` se muestra siempre como texto.
- Helper `textoPrecioProducto` (`constants/tarjetas.js`): "$25.000" / "Desde $25.000"; vacío si no hay precio (nunca "$0").
- Precio visible en las 4 nuevas, `PlantillaProBase` y las básicas A, B y C. En las básicas va como una línea
  bajo el nombre; todas tienen ese lugar natural, así que no hubo nada que forzar.
- Vacío: muestra `anio` en lugar del número de orden cuando existe; el precio ocupa la etiqueta izquierda.
- Confianza: los chips salen de `zonas_cobertura`; sin zonas la barra se oculta. Se quitó la regla basada en `direccion`.

## Verificación (BD de desarrollo, datos de prueba borrados al final; 0 restos)

Se ejecutaron las vistas reales con cliente de prueba (solo se simuló la sesión de Banexa).
Para ello hubo que aplicar `0015` y `0016` en la BD de desarrollo `tarjeta_digital_dev`.

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Producto con precio 25000 + "Desde" (y año 2024) | el endpoint público devuelve `precio_clp=25000`, `precio_desde=true`, `anio=2024`; también por multipart (PATCH a 30000, año 2025) |
| 2 | Precio negativo | 400 "El precio debe ser mayor a 0." |
| 2 | Precio 0 | 400 "El precio debe ser mayor a 0." |
| 2 | Precio 100.000.000 | 400 "El precio no puede superar $99.999.999." |
| 2 | Precio "abc" | 400 "El precio debe ser un número entero." |
| 2 | Año 1800 | 400 "El año debe estar entre 1900 y 2027." |
| 2 | Año 2999 | 400 "El año debe estar entre 1900 y 2027." |
| 2 | Edición con precio negativo o año 1800 | 400, el producto queda intacto (30000 / 2025); 0 productos creados por entradas inválidas |
| 3 | Producto sin precio | devuelve `null`/`false`/`null`; en Confianza, Vacío y la básica A no aparece precio ni "$0" |
| 4 | Zonas "Las Condes, Vitacura" | se guardan y salen en el público; Confianza muestra 2 chips |
| 4 | Sin zonas | la barra de zonas no aparece |
| 4 | Zonas de 301 caracteres | 400 "Las zonas no pueden superar los 300 caracteres." |
| 5 | Firma "Hecho con Kabymur" | presente en el pie de Serena, Confianza, Vacío y Revista (vista en Confianza y Vacío; en las otras dos el código la renderiza siempre) |

Además: `manage.py check` sin problemas, `makemigrations --check` sin cambios pendientes, `pnpm build` sin errores.

## Qué NO se probó
- El editor en un navegador: el formulario de producto y el campo de zonas se compilaron y su backend se probó por API,
  pero no se hicieron clics reales en la pantalla (requiere sesión de Banexa).
- Revista y Serena con precio: se verificaron con datos de prueba en el código compartido; sin captura propia.

## Pendiente (fuera de esta tarea)
- Parte 2 (preparar despliegue) quedó descartada por indicación de Mario.
- Los productos existentes no tienen precio: hay que editarlos para que lo muestren.
