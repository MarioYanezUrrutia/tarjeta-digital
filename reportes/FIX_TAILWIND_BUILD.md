# FIX: Tailwind build frontend

Fecha: 2026-09-02

Problema:
- `npm run build` fallaba con el mensaje indicando que el plugin de PostCSS de Tailwind se movió a `@tailwindcss/postcss`. La configuración previa usaba `tailwindcss` como plugin PostCSS directo, incompatible con Tailwind v4.

Acción realizada:
1. Actualicé `frontend/postcss.config.cjs` para usar `@tailwindcss/postcss` en lugar de `tailwindcss`.
2. Instalé la dependencia dev `@tailwindcss/postcss` en `frontend`.
3. Corrí `npm run build` y la compilación fue exitosa.

Archivos tocados:
- `frontend/postcss.config.cjs` (modificado)
- `frontend/package-lock.json` (actualizado tras `npm install`)

Verificación:
- `npm run build` completó con éxito: ✓ built

Commit:
- Mensaje: "fix(frontend): configurar Tailwind v4 igual que Banexa para que compile"

