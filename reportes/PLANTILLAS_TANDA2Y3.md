# Plantillas Pro — Tandas 2 y 3 (8 plantillas) + bloque "Cómo funciona"

Commits (rama main, sin push):
1. `ea3a2e1` feat(pasos): bloque Cómo funciona y choices de 8 plantillas
2. `3ed1b4d` feat(plantillas): tanda 2 — Pausa, Huella, Lustre, Mosaico
3. (este) feat(plantillas): tanda 3 — Balance, Miga, Forma, Tinta

## Parte A — Bloque "Cómo funciona"

- Modelo `PasoProceso` (tarjeta FK CASCADE, `orden`, `titulo` ≤ 60, `texto` ≤ 200). Máximo 4 por landing; solo Pro
  (la validación vive en el modelo y en la vista, con mensajes en español).
- `Tarjeta.mostrar_pasos` (por defecto True) en `CAMPOS_EDITABLES` y en los serializers.
- Endpoints calcados de FAQ: `/api/tarjetas/<id>/pasos/`, `/pasos/reordenar/`, `/api/pasos/<id>/`.
  Serializer público (`pasos`, vacío si `mostrar_pasos` es False o la tarjeta no es Pro) y de panel.
- Editor (solo Pro): sección "Cómo funciona" con la ayuda "Hasta 4 pasos. Ej.: Evaluación, Plan, Alta."
- Choices de plantilla: `pausa`, `huella`, `lustre`, `mosaico`, `balance`, `miga`, `forma`, `tinta`.
- Una sola migración: `0017_pasos_proceso_y_plantillas`.

Prueba (BD de desarrollo, datos borrados al final; 0 restos):
crear (201), editar (200), borrar (204); el 5.º paso → 400 "Ya alcanzaste el máximo de 4 pasos.";
una tarjeta básica no puede tener pasos (API → 400 y el modelo también lo rechaza); título de 61 y texto de 201
caracteres → 400; título vacío → 400; reordenar y ocultar con `mostrar_pasos` funcionan.

## Plantillas (componente propio cada una, en `frontend/src/plantillas/pro/`)

| Tanda | Plantilla | Rubro | Archivo |
|---|---|---|---|
| 2 | Pausa | salud | `PlantillaPausa.jsx` |
| 2 | Huella | mascotas | `PlantillaHuella.jsx` |
| 2 | Lustre | lujo metálico | `PlantillaLustre.jsx` |
| 2 | Mosaico | bento | `PlantillaMosaico.jsx` |
| 3 | Balance | consultoría | `PlantillaBalance.jsx` |
| 3 | Miga | comida por encargo | `PlantillaMiga.jsx` |
| 3 | Forma | talleres | `PlantillaForma.jsx` |
| 3 | Tinta | eventos | `PlantillaTinta.jsx` |

Compartido: `proComun.jsx` (reglas comunes), `tanda2.css`, `tanda3.css` (portados de las referencias),
`PlantillaProSelector.jsx` (dispatcher), selector del editor y miniaturas.
No se tocaron `PlantillaProBase`, las 6 Pro antiguas ni las 4 de la tanda 1.

Reglas comunes aplicadas en las 8 (helper `analizarProducto`):
- Titular = eslogan; lo que va después de la primera coma se resalta con el estilo de cada plantilla.
- Precio = `precio_clp` en es-CL, con "Desde" si `precio_desde`; sin precio, el lugar queda vacío.
- `detalle` ≤ 20 caracteres = dato corto junto al precio ("45 min", "al mes"); más largo = texto aparte.
- `caracteristicas` con varias líneas (o con " · ") = una fila por línea, y lo que va tras el último " · " a la derecha.
  Una sola línea sin " · " es la descripción.
- Imagen de la tarjeta en lugar del degradado donde la referencia lo pedía (Pausa, Huella y Miga).
- Bloques sin datos se ocultan; se respetan los `mostrar_*`; firma "Hecho con Kabymur" al pie de las 8.
- Las secciones comunes que una plantilla no usa en su mapeo (noticias, preguntas, más testimonios) se muestran
  al final con el estilo de la plantilla, para no perder lo que la persona cargó.

Fuentes: un solo `@import` central en `src/index.css`, con los pesos usados (ver el comentario del archivo).

## Decisiones que conviene conocer

1. **Fechas de Tinta.** `Noticia.fecha` es una fecha opcional y el modelo no tiene fecha de creación. Una noticia sin
   fecha se muestra sin bloque de día y mes (no se inventa una).
2. **Instagram.** Puede venir como URL o como usuario suelto (`estudioaura`, como en `demo-pro`). Mosaico y Tinta
   lo normalizan a `@usuario` y arman el enlace. Las plantillas anteriores usan el valor tal cual (no se tocaron).
3. **Botones de WhatsApp.** Los textos de la referencia eran específicos del rubro ("Agendar baño", "Reservar silla").
   Se usaron verbos neutros: "Reservar hora", "Agendar por WhatsApp", "Reservar por WhatsApp", "Encargar por
   WhatsApp", "Cotizar por WhatsApp", "Escribir por WhatsApp".
4. **Contenido de ejemplo omitido** (no son campos): "Registro Superintendencia…", "Valores netos", "Retiro gratis en
   Ñuñoa", "¡Feliz día!", estadísticas, "Disponible", etc. Los rótulos fijos que quedan son genéricos ("Servicios",
   "Para encargar", "cursos", "Packs", "Planes", "Zonas", "Despacho a").
5. **Corrección a la referencia de Pausa.** En móvil, la grilla de cada atención se solapaba (auto-colocación de
   `grid-row`); se colocaron las celdas de forma explícita.
6. **Lustre.** El texto que gira del medallón se repite hasta cubrir el anillo y se ajusta con `textLength`.
7. **Mosaico.** Si queda una tarjeta de una columna sola, se ensancha para no dejar un hueco.
8. **Imágenes de `demo-pro`.** En la revisión local aparecen rotas porque `/media/...` lo sirve Django, no la
   página de prueba; en la app real cargan.

## Verificación

- `manage.py check`: sin problemas. `makemigrations --check`: sin cambios pendientes (tras la 0017).
- `pnpm build`: sin errores.
- Revisión visual a 390 px de ancho (iframe de 390 px) de las 8 plantillas con tres juegos de datos:
  completos (productos con filas, precio "Desde", detalle corto y largo, imagen, pasos, testimonios, noticias con
  fecha, preguntas, zonas), `demo-pro` y mínimos. Sin texto de relleno, sin cortes de texto y con la firma.
  Correcciones hechas en la revisión: Pausa (filas solapadas), Huella (tickets sin datos de pie), Mosaico
  (precio apiñado y hueco en la grilla), Balance (filas del plan y negrita de los pasos).
- Firma "Hecho con Kabymur": una por plantilla, en el pie, en las 8.

## Qué no se probó
- El editor de pasos en un navegador con sesión de Banexa (se probó el backend y se compiló el frontend).
- Las 8 plantillas con datos reales de producción (la landing 18 no existe en la BD de desarrollo).
- Navegadores distintos de Chrome y pantallas distintas de 390 px (el diseño es mobile first; no se revisó escritorio).
