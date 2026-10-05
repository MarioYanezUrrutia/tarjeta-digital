# Pro 2.0 — Paso 6b: selector de planes, cupos Fundador y firma (frontend)

## Qué se hizo
- **ModalPago** (flujo Pro): carga `planes-pro`, lista vertical de opciones tocables (radio), Fundador destacado y preseleccionado (si no hay, Mensual), etiqueta "Más conveniente" en Anual, ahorro del backend, "Quedan X de N cupos", "Precio fundador hasta dd-mm-aaaa", botón "Pagar $X" deshabilitado mientras carga. Envía `{plan}` a `pagar-mp`. Terras (tarjetas básicas) intacto.
- **TarjetaEditor**: borrador igual (abre el selector); activa → "Extender vigencia"; vencida/cortada → banner + "Renovar".
- **Panel**: aviso "Precio Fundador…" (sin landing y en borrador, si quedan cupos) y etiqueta "Fundador Nº X".
- **PlantillaProBase**: firma "Hecho con Kabymur" en el pie (reemplaza "Powered by Kabymur"), enlace a https://tarjeta.kabymur.com, `target=_blank rel=noopener`, con los colores del tema.
- **Retorno MP**: "Vigente hasta dd-mm-aaaa" bajo "¡Tu landing está publicada!".
- Formato `formatearCLP` (Intl es-CL) en `constants/tarjetas.js`.

## Backend (mínimo, sin modelos ni migraciones)
1. `planes-pro` ahora devuelve `fundador_precio_hasta` (solo lectura; null si el beneficio no rige).
2. `MisTarjetasSerializer` expone `numero_fundador` (solo lectura). **Fuera de lo autorizado**, pero la etiqueta "Fundador Nº X" del panel no se puede mostrar sin ese dato.

## Puntos a revisar
- "Equivale a $X al mes" = `Math.round(monto / meses)` en el frontend (solo presentación; el backend no lo devuelve).
- "2 meses gratis" (Anual) se deduce de `ahorro / monto mensual` solo si es exacto; si no, solo "Ahorras $X".
- "$1.500 al mes" del aviso del panel es texto fijo (cupos-fundador no entrega el precio). Si el admin cambia el precio fundador, hay que actualizarlo o exponer el dato.

## Verificación
- `pnpm build`: OK. `manage.py check`: sin problemas. `manage.py test apps.tarjetas`: 2 tests OK.
