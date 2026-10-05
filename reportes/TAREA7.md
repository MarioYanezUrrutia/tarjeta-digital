# Tarea 7 — Clave Banexa, tarjeta básica al guardar, precio fundador desde servidor

## A) Clave privada de Banexa — NO implementado (Banexa no permite saber si hay clave)
Revisado el código de Banexa (bot_ia, apps/terras + apps/api):
- Sin clave, `POST /terras/cobrar-servicio/` responde **400** `{"ok": false, "error": "Primero debes crear tu clave privada de transferencias."}` (ClaveNoConfigurada). `pagar_tarjeta` (apps/tarjetas/pago_views.py) lo reenvía tal cual y el modal lo muestra como texto de error rojo. Con clave mala: 403 "La clave privada no es correcta."; bloqueada: 403.
- Ningún endpoint ni campo dice si el usuario tiene clave: `/auth/perfil/` (UserProfileSerializer) y `/terras/saldo/` no la exponen; `private_password` solo se lee dentro de services.py. Hacer el chequeo previo exige un cambio en Banexa.
- Dónde se crea: portal Banexa, ruta `/mi-clave` (portal_banexa/src/routes/MiClave.jsx, llama `POST /terras/clave-privada/`). El dominio del portal no está confirmado en el código; solo hay indicios de `kabymur.com`.

## B) Tarjeta básica al guardar
- Backend: `POST /api/tarjetas/` acepta los campos de CAMPOS_EDITABLES y crea la tarjeta con ellos (límite de 3 y anti-duplicado de 10 s intactos). Sin imagen.
- Frontend: nueva ruta `/panel/tarjeta/nueva` (TarjetaEditor en modo "nueva"); "Crear mi tarjeta" y "+ Crear otra tarjeta" solo navegan. Primer Guardar → crea y redirige a `/panel/tarjeta/<id>`. Foto y productos deshabilitados con "Guarda tu tarjeta para agregar fotos y productos."; se ocultan estado/pago y "Comparte". La landing Pro no cambia.

## C) Precio Fundador
- `GET /api/cupos-fundador/` devuelve `equivalente_mensual` = round(fundador_precio_clp / fundador_meses). El panel lo muestra con es-CL (ya no hay $1.500 fijo).

## Verificación
- Escenarios en BD de desarrollo (sin atomic externo, datos borrados al final): (1) crea con datos OK; (2) cuarta tarjeta → 400 "máximo 3"; doble envío → 201 y 200 con el mismo id; (3) equivalente_mensual = 1500 con 9000/6.
- `manage.py check` OK; `makemigrations --check --dry-run`: sin cambios; `pnpm build` OK; tests apps.tarjetas 2/2.
