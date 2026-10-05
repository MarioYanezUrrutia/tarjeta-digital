# Tarea 8 — Aviso clave Banexa, firma webhook MP, fuera Flow, pagos con SET_NULL

## A) Aviso de clave privada (reactivo)
- `pagar_tarjeta`: si Banexa responde 400 con "Primero debes crear tu clave privada…", responde 400 `{ok:false, codigo:'sin_clave_privada', detail, error, url_clave}`. La detección vive solo en `_es_error_sin_clave` / `BANEXA_MSG_SIN_CLAVE` (pago_views.py).
- `url_clave` sale de `BANEXA_URL_CLAVE` (settings; agregada a `.env`, `.env.example`, `.env.production.example`, vacía por defecto). **Hay que completarla en el .env de producción** (página de Banexa donde se crea la clave, ruta `/mi-clave` del portal); vacía = solo el texto, sin botón.
- Modal Terras: texto "Para pagar con Terras necesitas tu clave privada de Banexa." + botón "Crear mi clave en Banexa" (pestaña nueva, `noopener`). El formulario sigue disponible para reintentar. 403 (incorrecta/bloqueada) y otros 400 (saldo) sin cambios.

## B) Firma del webhook de MP
- `mercadopago.verificar_firma_webhook`: header `x-signature` (`ts`, `v1`), `x-request-id`, `data.id` (query, minúsculas), HMAC-SHA256 con `MP_WEBHOOK_SECRET`, `hmac.compare_digest`.
- Firma inválida/ausente → 401 + `logger.warning`, sin procesar. Secreto vacío → rechaza todo + `logger.error`. Firma válida con orden desconocida o no aprobada → 200 sin cambios. Se sigue consultando la orden a la API de MP.
- Documentación: https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/notifications (e idem `.cl`; webhooks generales: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks).
- **Salvedad:** las páginas dieron 403/404 o resúmenes que no coincidían sobre el manifest exacto. Se implementaron las dos formas conocidas, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` y `<data.id>|<x-request-id>|<ts>`. Ambas exigen el secreto, así que aceptar las dos no debilita nada. **Confirmar con una notificación real de MP** y, si solo una funciona, dejar solo esa.
- **Para el despliegue:** `MP_WEBHOOK_SECRET` debe estar en el .env de producción; si no, el webhook rechaza todo (la verificación al volver del checkout sigue activando el pago).

## C) Flow eliminado
Borrados `flow.py`, vistas y rutas de Flow, `PagoFlowRetorno.jsx` (+ su ruta), `crearPagoFlow`, variables `FLOW_*` de settings y .env.example. Búsqueda final: solo queda `flow_order` (campo conservado, guarda el id de MP) y migraciones históricas.

## D) Pagos se conservan
- `PagoTarjeta.tarjeta`: `null=True`, `on_delete=SET_NULL`; nuevo `tarjeta_ref` ("id=7 slug=ana"), llenado en `save()` al crear cualquier pago.
- Migraciones: `0013_pagos_set_null_y_referencia` (esquema) y `0014_pagos_completar_referencia` (datos: completa los pagos existentes).
- Una básica con pagos se borra y el pago queda con tarjeta vacía y su referencia. La Pro con pagos sigue dando 409.
- Admin de pagos muestra y busca por `tarjeta_ref`; `__str__` ya no depende de la tarjeta ni de `medio='flow'`.

## Verificación (BD de desarrollo, MP y Banexa simulados, datos borrados)
(1) sin clave → 400 `sin_clave_privada` + url; (2) clave incorrecta → 403 igual que antes; (3) firma válida + aprobada → activa; (4) firma inválida → 401, sin cambios; (5) sin header → 401; (6) orden desconocida / no aprobada → 200 sin cambios; (7) borrar básica con pago → 204, pago con `tarjeta=None` y referencia; (8) borrar Pro con pago → 409; (9) pagar-mp + retorno → aprobado y activa. Extras: secreto vacío → 401; firma con otro request-id → 401; segundo aviso → "ya procesado" sin duplicar.
`manage.py check` OK; `makemigrations --check` sin cambios; tests apps.tarjetas 2/2; `pnpm build` OK.
