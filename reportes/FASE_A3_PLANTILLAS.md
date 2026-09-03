# Fase A.3 — Plantillas A y B para la página pública

Fecha: 2026-09-03

Objetivo: agregar dos pieles visuales más (A "Elegante" y B "Moderna") a la
página pública `/t/<slug>`, que ya funcionaba con la plantilla C
(link-in-bio). Las tres muestran los mismos datos/secciones y respetan los
mismos flags — solo cambia el estilo.

## Valores del campo `plantilla`

Se definieron como valores válidos:

| Valor     | Plantilla        |
|-----------|-------------------|
| `A`       | Elegante          |
| `B`       | Moderna           |
| `C`       | Link en bio       |
| `default` | alias histórico de `C` (compatibilidad hacia atrás) |

`Tarjeta.plantilla` pasó de `CharField(max_length=128, default='default')`
sin choices a `CharField(max_length=32, choices=PLANTILLA_CHOICES,
default='C')` en `backend/apps/tarjetas/models.py`. Se generó la migración
`0002_alter_tarjeta_plantilla.py`. Se mantuvo `'default'` como choice válido
(no se eliminó) para no romper `full_clean()` sobre tarjetas ya guardadas
con ese valor antes de este cambio.

En el frontend, `frontend/src/plantillas/index.js` mapea
`{A, B, C, default} -> {PlantillaA, PlantillaB, PlantillaC, PlantillaC}`.
**Cualquier otro valor (o ausente) cae en `PlantillaC` por defecto**
(fallback explícito con `PLANTILLAS[nombre] || PlantillaC`), sin importar si
esos valores inválidos existen porque el modelo los rechaza — es una
protección extra en el frontend por si llegan datos con un `plantilla` que
el backend actual no conoce (tarjetas viejas, importaciones, etc.).

Se agregó `plantilla` a `list_display` y `list_filter` en
`backend/apps/tarjetas/admin.py` para poder cambiarla fácilmente desde el
admin durante la verificación.

## Reparto de lógica (sin duplicar datos/flags por plantilla)

- `frontend/src/plantillas/useDatosTarjeta.js` (nuevo): hook con la lógica
  de datos que antes vivía duplicada dentro de `PlantillaC.jsx`. Calcula,
  una sola vez, a partir de la tarjeta:
  - `contactos`: array de botones de contacto con valor, solo si
    `mostrar_contacto`.
  - `redes`: array de redes con valor, solo si `mostrar_redes`.
  - `mostrarUbicacionSeccion`: `mostrar_ubicacion` y hay dirección u horario.
  - `mostrarProductosSeccion`: `mostrar_productos` y hay productos.
  - También exporta `iniciales(nombre)` para el avatar cuando no hay
    imagen.
- `frontend/src/plantillas/PlantillaA.jsx`, `PlantillaB.jsx`,
  `PlantillaC.jsx`: cada una llama a `useDatosTarjeta(tarjeta)` y solo
  decide *cómo se ve* cada botón/sección. Ninguna vuelve a calcular qué
  mostrar.
- `frontend/src/pages/TarjetaPublica.jsx` (sin cambios en esta fase): sigue
  siendo el único lugar que hace `fetch` y maneja
  cargando/error/listo; elige el componente con `getPlantilla(tarjeta.plantilla)`
  y le pasa la tarjeta completa. No sabe nada de estilos.
- `PlantillaC.jsx` se modificó **solo** para usar el hook compartido en vez
  de tener la lógica inline — el resultado visual es idéntico al de la Fase
  A.2 (se verificó por captura de pantalla, sin cambios).

## Plantilla A — Elegante

Fondo blanco, tipografía Manrope (cargada vía Google Fonts en
`frontend/index.html`), foto/iniciales con borde fino gris, nombre en 22px,
línea divisoria antes de los botones, botones con borde fino y fondo
blanco (hover gris muy claro), "Guardar contacto" como botón primario oscuro
sólido. Secciones sobre/ubicación/productos en cajas con borde fino, sin
sombra, look aireado.

## Plantilla B — Moderna

Fondo con degradado `linear-gradient(150deg, #6a5cff 0%, #9b4dff 42%,
#ff5c8a 100%)`, tipografía Poppins, texto blanco. Foto/iniciales con borde
blanco de 3px. Botones tipo píldora (`rounded-full`) semitransparentes con
blur (hover más opacos). "Guardar contacto" primario en blanco sólido con
texto violeta `#7b3ff2`. Secciones sobre/ubicación/productos en cajas
translúcidas con blur y borde blanco tenue, para mantener contraste sobre
el degradado.

## Verificación

1. Backend y frontend levantados (`manage.py runserver 8000`, `npm run dev`).
2. Se cambió `plantilla` de la tarjeta `demo` a `A`, `B` y `C` (por shell de
   Django, equivalente a hacerlo desde el admin) y se verificó cada caso en
   `/t/demo` con Chrome headless (captura de pantalla + volcado de texto del
   DOM):
   - Los tres muestran los mismos datos (nombre, cargo, empresa, eslogan,
     contacto, redes, sobre, ubicación, productos) y los mismos botones
     (WhatsApp/Llamar/Correo/Sitio web/Instagram/LinkedIn — sin
     Facebook/TikTok/YouTube/X, que siguen vacíos en la tarjeta demo).
   - Solo cambia el estilo, como se esperaba.
3. Se forzó un valor inválido (`'invalida'`, escrito directo con
   `QuerySet.update()` para saltarse la validación del modelo y simular un
   dato viejo/corrupto) y se confirmó que `/t/demo` sigue mostrando la
   plantilla C (fallback) sin errores.
4. `npm run build` compiló sin errores (bundle CSS 14.90 kB, JS 199.64 kB).
5. `python manage.py test apps.tarjetas` sigue en verde.
6. Se restauró la tarjeta demo a `plantilla='C'` al terminar.

## Archivos creados/modificados

- `backend/apps/tarjetas/models.py` (modificado — choices y default de
  `plantilla`)
- `backend/apps/tarjetas/migrations/0002_alter_tarjeta_plantilla.py` (nuevo)
- `backend/apps/tarjetas/admin.py` (modificado — `plantilla` en list_display/list_filter)
- `frontend/index.html` (modificado — fuentes Manrope/Poppins)
- `frontend/src/plantillas/useDatosTarjeta.js` (nuevo)
- `frontend/src/plantillas/PlantillaA.jsx` (nuevo)
- `frontend/src/plantillas/PlantillaB.jsx` (nuevo)
- `frontend/src/plantillas/PlantillaC.jsx` (modificado — usa el hook compartido, mismo resultado visual)
- `frontend/src/plantillas/index.js` (modificado — mapa A/B/C/default)
- `reportes/FASE_A3_PLANTILLAS.md` (este archivo)

## Próximos pasos recomendados

- Si se agrega una plantilla nueva, solo hace falta: agregar el choice en
  `Tarjeta.PLANTILLA_CHOICES`, crear el componente `PlantillaX.jsx` usando
  `useDatosTarjeta`, y sumar la entrada en `plantillas/index.js`.
- Seguir pendientes de la Fase A.2: validar `estado` de la tarjeta cuando
  exista suscripción, y la descarga real de `.vcf` en "Guardar contacto"
  (ambos con `// TODO` en el código, iguales en las tres plantillas).
