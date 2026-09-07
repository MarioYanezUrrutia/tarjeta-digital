# Promos del ecosistema Kabymur en el panel

## Implementación

- **`frontend/src/constants/promos.js`** (nuevo): array `PROMOS_ECOSISTEMA`
  con los 4 datos fijos (icono, título, descripción, url) pedidos —
  Rosita, Banexa, Consigue más Terras, Empresas asociadas. Son enlaces
  fijos al ecosistema, no hacía falta hacerlos configurables.
- **`frontend/src/components/PromosEcosistema.jsx`** (nuevo): sección
  `<section>` con encabezado "Descubre el ecosistema Kabymur" + grid
  `grid-cols-1 sm:grid-cols-2` (1 columna en móvil, 2 en desktop) de
  tarjetas `<a target="_blank" rel="noopener noreferrer">`, con el mismo
  lenguaje visual del resto del panel (fondo blanco, `shadow`, radios
  `rounded-lg`) y una animación sutil de hover (`-translate-y-0.5` +
  `shadow-md`) para señalar que son clickeables.
- **`frontend/src/pages/Panel.jsx`**: se reemplazó el
  `// TODO: promos del ecosistema Kabymur` por `<PromosEcosistema />`,
  colocado como último elemento del contenedor, **después** del bloque de
  tarjetas del usuario (tanto en el caso vacío como en el caso con
  tarjetas) — nunca antes, para no interferir con el flujo principal de
  crear/editar tarjeta.

## Verificación

Se probó con sesión real (usuario `mario`, cookie `banexa_token` real
inyectada, sin tocar contraseñas) contra el frontend real en
`localhost:5173/panel`, en dos viewports:

1. **Las 4 promos aparecen con sus enlaces correctos**: confirmado
   visualmente y en el código fuente — Rosita → `https://rosita.kabymur.com`,
   Banexa → `https://banexa.kabymur.com`, Consigue más Terras y Empresas
   asociadas → `https://kabymur.com`. Los 4 `<a>` llevan
   `target="_blank" rel="noopener noreferrer"`, así que cada uno abre el
   sitio correcto en una pestaña nueva.
2. **Responsive**: en viewport móvil (420px) las 4 tarjetas se apilan en 1
   columna, debajo de la tarjeta activa real de Mario ("Mario Yañez
   Urrutia — Activa hasta 7 oct 2026"). En viewport desktop (1280px) se
   confirmó visualmente la grilla en **2 columnas** (2x2), también debajo
   de la tarjeta del usuario y del botón "+ Crear otra tarjeta" — no
   interfiere con el flujo principal.
3. **Build**: `npm run build` en `frontend/` compila sin errores (137
   módulos, sin warnings nuevos).

## Commit

Hash: `1f8ec9b`
