# Ajustes finales: raíz → login, cursor pointer, vCard

## Ajuste 1: la raíz (/) redirige al login (o al panel si hay sesión)

`Home.jsx` (la página de prueba "Tarjeta Digital / API health: ok") se
eliminó y no se usa en ningún otro lado.

En `frontend/src/App.jsx` la ruta `/` ahora renderiza un componente
`RedireccionRaiz` que usa `useAuth()` (el mismo `AuthContext` que ya
consulta `/auth/me/` al cargar la app):

- mientras `cargando` es `true`, muestra el mismo spinner que ya usa
  `RutaProtegida` (evita un parpadeo hacia `/login` antes de saber si hay
  sesión);
- resuelto eso, `<Navigate to={user ? '/panel' : '/login'} replace />`.

Se implementó la detección de sesión (no la alternativa "siempre a
/login") porque `AuthContext` ya expone `user`/`cargando` — no había nada
que complicar.

## Ajuste 2: cursor pointer en elementos clicables

Se revisó todo el código (`TarjetaEditor.jsx`, `GestionProductos.jsx`,
`Panel.jsx`, `CompartirTarjeta.jsx`, `ModalPago.jsx`, etc.): **no hay
ningún `div`/`span` actuando como botón** — todo lo clicable ya es un
`<button>` nativo (selector de plantilla, toggles "Mostrar", botones de
producto, Guardar, etc.).

El problema es otro: este proyecto usa Tailwind v4, y desde la v3 el
preflight de Tailwind **ya no pone `cursor: pointer` en `<button>`** (al
revés de v1/v2) — por eso todos esos botones mostraban la flecha normal.

En vez de agregar `cursor-pointer` botón por botón en ~20 lugares, se
agregó una regla global en `frontend/src/index.css`:

```css
button:not(:disabled),
[role='button']:not(:disabled) {
  cursor: pointer;
}
```

Esto cubre todos los botones nativos de la app (editor, panel, modales,
plantillas públicas) de una sola vez, incluyendo los que se agreguen a
futuro, sin tocar la funcionalidad de ninguno. Los botones deshabilitados
quedan excluidos (siguen con su propio `disabled:cursor-not-allowed` donde
ya lo tenían, o el cursor por defecto del navegador).

## Ajuste 3: botón "Guardar contacto" — genera un .vcf real

**Enfoque usado: frontend puro (Blob + `<a download>`)**, como sugería la
tarea — no hizo falta backend, la página pública ya tiene todos los datos.

Se centralizó la lógica en `frontend/src/plantillas/useDatosTarjeta.js`
(el módulo ya compartido por las 3 plantillas), dos funciones nuevas:

- `generarVCard(tarjeta)`: arma el texto vCard **3.0** (el formato más
  compatible con agendas de iOS/Android) con `\r\n` como separador de
  línea. Solo agrega los campos que tienen valor:
  - `FN`/`N`: `nombre_mostrado` (o "Contacto" si viene vacío)
  - `ORG`: `empresa`
  - `TITLE`: `cargo_rubro` o, si no hay, `profesion`
  - `TEL;TYPE=WORK,VOICE`: `telefono`
  - `TEL;TYPE=CELL`: `whatsapp` (solo si es distinto al teléfono, para no
    duplicar)
  - `EMAIL;TYPE=INTERNET`: `email_contacto`
  - `URL`: `sitio_web` y cada red social que tenga valor (instagram,
    facebook, linkedin, tiktok, youtube, x_twitter)
  - Los valores se escapan (`;`, `,`, `\`, saltos de línea) según el
    estándar del formato vCard, para no romper el archivo si algún dato
    trae esos caracteres (ej. "María Pérez, CEO").
- `descargarVCard(tarjeta)`: arma el Blob (`type: 'text/vcard;charset=utf-8'`),
  crea un `<a download>` temporal y dispara el click — el nombre del
  archivo es el `nombre_mostrado` limpiado de tildes/símbolos (ej.
  `Maria_Perez.vcf`), o `contacto.vcf` si no hay nombre.

Las 3 plantillas (`PlantillaA/B/C.jsx`) quitaron el `// TODO` y ahora el
botón "Guardar contacto" llama `onClick={() => descargarVCard(tarjeta)}` —
la misma función en los tres casos, nada duplicado.

**Verificación del contenido**: se probó `generarVCard` con datos de
ejemplo (nombre con tilde y coma, empresa con `;`, teléfono, whatsapp,
email, sitio web, red social) y el resultado es un vCard 3.0 válido y bien
escapado:

```
BEGIN:VCARD
VERSION:3.0
FN:María Pérez\, CEO
N:María Pérez\, CEO;;;;
ORG:Kabymur S.A.\; Terras
TITLE:Gerente General
TEL;TYPE=WORK,VOICE:+56912345678
TEL;TYPE=CELL:+56987654321
EMAIL;TYPE=INTERNET:maria@kabymur.com
URL:https://kabymur.com
URL:https://instagram.com/kabymur
END:VCARD
```

## Verificación

- `npm run build` (frontend) → compila sin errores (136 módulos, ~19s).
- Cursor pointer: confirmado por inspección de código que ya no queda
  ningún botón nativo sin la regla CSS aplicándose (regla global, no
  depende de que cada componente la declare).
- vCard: validado el formato con un caso de prueba con caracteres
  especiales (tildes, comas, punto y coma) — escapa correctamente y el
  resultado es un `BEGIN:VCARD ... END:VCARD` válido.

## Archivos modificados

- `frontend/src/App.jsx` — `/` redirige según sesión.
- `frontend/src/pages/Home.jsx` — eliminado (ya no se usa).
- `frontend/src/index.css` — regla global `cursor: pointer` para botones.
- `frontend/src/plantillas/useDatosTarjeta.js` — `generarVCard` y
  `descargarVCard`.
- `frontend/src/plantillas/PlantillaA.jsx`,
  `frontend/src/plantillas/PlantillaB.jsx`,
  `frontend/src/plantillas/PlantillaC.jsx` — botón "Guardar contacto"
  funcional.
