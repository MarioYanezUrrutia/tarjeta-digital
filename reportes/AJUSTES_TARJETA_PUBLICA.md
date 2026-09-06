# Ajustes a la tarjeta pública + campo profesión

Cuatro ajustes solicitados tras revisar la tarjeta en uso real.

## Ajuste 1 — Campo nuevo `profesion`

- **`backend/apps/tarjetas/models.py`**: nuevo campo
  `profesion = models.CharField(max_length=120, null=True, blank=True)`,
  agregado junto a `cargo_rubro` (que se mantiene sin cambios).
- **Migración**: `backend/apps/tarjetas/migrations/0003_tarjeta_profesion.py`,
  generada con `makemigrations` y aplicada con `migrate` (verificado con
  `manage.py check` sin issues).
- **`backend/apps/tarjetas/serializers.py`**: `profesion` agregado a
  `TarjetaPanelSerializer.Meta.fields` (editable desde el panel) y a
  `TarjetaPublicaSerializer.Meta.fields` (visible en la página pública).
- **`backend/apps/tarjetas/panel_views.py`**: `profesion` agregado a
  `CAMPOS_EDITABLES`, que es lo que efectivamente permite que el PATCH
  `/api/tarjetas/<id>/` lo actualice.
- **`frontend/src/pages/TarjetaEditor.jsx`**: input "Profesión" agregado a
  `CAMPOS_TEXTO_IDENTIDAD` justo después de "Cargo o rubro", y a
  `VALORES_INICIALES` (con lo que automáticamente queda incluido en
  `CAMPOS_A_GUARDAR`, que arma el payload del PATCH — mismo mecanismo
  genérico que ya usan `nombre_mostrado`, `cargo_rubro`, `empresa`, etc.).
- **`PlantillaA/B/C.jsx`**: la línea de cargo/empresa bajo el nombre ahora es
  `[profesion, cargo_rubro, empresa].filter(Boolean).join(' · ')` — se
  muestra solo si alguno de los tres tiene valor, y cada segmento es opcional
  individualmente.

**Verificado** (sin pasar por el navegador, directo contra el modelo/serializer,
que es el mismo camino que ejecuta el PATCH real —`setattr` + `.save()`—):
guardar `profesion` en una tarjeta de prueba, releer de la base y confirmar que
aparece en `TarjetaPanelSerializer` y en `TarjetaPublicaSerializer`. Y en el
navegador: la página pública (`/t/<slug>`) muestra la profesión junto a
cargo/empresa en las 3 plantillas (ver capturas en la verificación general,
más abajo).

## Ajuste 2 — Dato de contacto visible junto al botón

- **`frontend/src/plantillas/useDatosTarjeta.js`**: cada entrada de
  `contactos` ahora trae un campo `valor` además de `label`/`href`/`Icon`:
  - WhatsApp → `valor: whatsapp` (tal cual lo ingresó el usuario)
  - Llamar → `valor: telefono`
  - Correo → `valor: email_contacto`
  - Sitio web → `valor` es la URL sin protocolo ni slash final (nuevo helper
    `formatearUrl`), ej. `https://estudiobravo.cl/` → `estudiobravo.cl`. El
    `href` del botón sigue siendo la URL completa original.
  - Los ítems de `redes` (Instagram, Facebook, etc.) no llevan `valor` — el
    ajuste pedido era solo para contacto.
- **`PlantillaA/B/C.jsx`**: `BotonAccion` ahora acepta `valor` y lo muestra
  como subtítulo bajo el label, dentro del mismo botón (ícono a la izquierda,
  columna de texto a la derecha con `label` arriba y `valor` en gris/translúcido
  y tamaño menor debajo, con `truncate` para no romper el layout en pantallas
  angostas). Estilo de cada plantilla respetado: gris sutil en A, blanco
  translúcido en B, gris sobre oscuro en C.
- Los flags (`mostrar_contacto`) y la regla "solo si el campo tiene valor" no
  cambiaron — siguen viviendo en `useDatosTarjeta` y controlan tanto el botón
  como su dato.

## Ajuste 3 — Foto de perfil más grande

- Avatar (imagen o iniciales) agrandado de `h-24 w-24` (96px) a `h-32 w-32`
  (128px) en las 3 plantillas, con el texto de iniciales subido de `text-2xl`
  a `text-3xl` para mantener la proporción. Sigue centrado en el header
  (`items-center`) y no rompe el layout en 420px de ancho (probado).

## Ajuste 4 — "Guardar contacto" se mantiene

No se tocó ese botón en ninguna plantilla — sigue siendo un placeholder visual
(comentario `// TODO: generar y descargar archivo .vcf real...` intacto).
Confirmado visualmente presente en las 3 plantillas tras los demás cambios.

## Verificación end a end

Se levantó el ambiente completo (frontend `:5173`, backend tarjeta-digital
`:8010`, backend Banexa `:8000`, ya en ejecución) y se creó una tarjeta de
prueba temporal (cliente `banexa_user_id='qa-temp-999'`, slug `ana-bravo`) con
foto vacía (iniciales "AB"), profesión, cargo, empresa, eslogan y los 4 campos
de contacto llenos.

Con capturas de `http://localhost:5173/t/ana-bravo` en las 3 plantillas
(cambiando `plantilla` directo en la fila para simular lo que haría el
selector del editor) se confirmó:

1. **Profesión visible**: "Disenadora Industrial · CEO · Estudio Bravo" bajo
   el nombre, en las 3 plantillas.
2. **Datos de contacto visibles**: cada botón muestra su label y, debajo, el
   dato real (`+56987654321`, `+56912345678`, `ana@estudiobravo.cl`,
   `estudiobravo.cl`), en las 3 plantillas, sin romper el layout en un
   viewport angosto (420px).
3. **Foto más grande**: círculo de 128px, centrado, en las 3 plantillas.
4. **"Guardar contacto"**: presente y sin cambios en las 3 plantillas.
5. **Flag `mostrar_contacto=false`**: probado sobre la misma tarjeta — el
   bloque de contacto desaparece por completo y el resto de la tarjeta
   (header + "Guardar contacto") se mantiene intacto.

Al terminar, se borró el cliente/tarjeta de prueba (`Cliente.objects.filter(
banexa_user_id='qa-temp-999').delete()`, cascada sobre su única tarjeta) y no
quedó ningún dato de QA en la base.

## Build

`npm run build` en `frontend/` compila sin errores (solo warnings preexistentes
de `react-router` sobre "use client", no relacionados). `python manage.py
check` en `backend/` no reporta issues.

## Notas

No se subió `.env` ni ningún archivo de credenciales. Los servidores de
desarrollo que se levantaron para la verificación (frontend y backend de
tarjeta-digital) se detuvieron al terminar; el backend de Banexa (`:8000`) ya
estaba corriendo de antes y no fue tocado.
