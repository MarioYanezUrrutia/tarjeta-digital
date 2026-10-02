# Pro 2.0 — Paso 6a: planes, plan Fundador y órdenes de pago (solo backend)

## Qué resuelve

La falla de producción: el pago se validaba contra el precio ACTUAL de la configuración. Ahora cada pago crea una `OrdenPagoPro` con su propio monto y meses (calculados en el servidor) y la confirmación valida contra esa orden.

## Modelo de datos (migraciones 0011 esquema + 0012 datos)

- `OrdenPagoPro`: tarjeta, referencia (única, = external_reference en MP), plan, meses, monto_clp, estado (pendiente/pagada), mp_order_id (único, nullable), creado.
- `Tarjeta`: `numero_fundador` (único, nullable) y `fundador_precio_hasta` (nullable).
- `ConfiguracionTarjetas`, todo editable en el admin:

| Campo | Valor inicial |
|---|---|
| `precio_pro_clp` (base mensual) | 5000 (la migración de datos 0012 lo fija; ojo: pisa cualquier valor previo, p. ej. un 100 de pruebas) |
| `descuento_semestral_pct` | 10 |
| `anual_meses_pagados` | 10 |
| `fundador_cupos` | 100 |
| `fundador_precio_clp` | 9000 |
| `fundador_meses` | 6 |
| `fundador_renovacion_precio_clp` | 3500 |
| `fundador_renovacion_meses` | 24 |
| `fundador_dias_gracia` | 5 |

## DECISIÓN QUE REQUIERE TU CONFIRMACIÓN: días de gracia

El enunciado habla de "los días de gracia que ya usa el sistema", pero el sistema NO tiene ese concepto: `revisar_vencimientos` pasa la landing a `vencida` en cuanto vence (el único parámetro cercano es `dias_aviso_previo`, que es un aviso ANTES de vencer). Agregué `fundador_dias_gracia` (default 5, editable en el admin). Un fundador pierde el beneficio si paga cuando pasaron más de esos días desde su vencimiento. Cámbialo si querías otro valor.

## Cálculo de planes (`apps/tarjetas/planes.py`)

Base = `precio_pro_clp`, o `fundador_renovacion_precio_clp` si al fundador le rige el beneficio.
- Mensual = base. Semestral = base × 6 × (100 − descuento)/100, redondeado. Anual = base × `anual_meses_pagados`.
- Con base 5000: 5.000 / 27.000 / 50.000. Con base 3500: 3.500 / 18.900 / 35.000.
- Fundador: solo si es la primera compra (sin pagos ni número de fundador) y quedan cupos. $9.000 por 6 meses.
- Beneficio activo = tiene número de fundador, no pasó `fundador_precio_hasta` y no venció más allá de la gracia. Rige también si renueva antes de terminar sus 6 meses de fundador (decisión mía: conviene al cliente y es lo más simple).
- Meses calendario con `sumar_meses` (31-ene + 1 mes = fin de febrero). Se suma desde el vencimiento si sigue vigente, o desde hoy.

## Endpoints

- `GET /api/tarjetas/<id>/planes-pro/` (dueño): planes con id, nombre, meses, monto, ahorro, tarifa y, en Fundador, `cupos_restantes`.
- `GET /api/cupos-fundador/` (público): `cupos_total` y `cupos_restantes`.
- `POST /api/tarjetas/<id>/pagar-mp/` body `{"plan": "fundador|mensual|semestral|anual"}` (por defecto `mensual`, así el frontend actual sigue funcionando). Plan inválido 400, no disponible 409. Crea la orden con su monto y la orden en MP por ese monto; si MP falla, borra la orden huérfana.

## Confirmación (`_activar_pro_desde_orden`, retorno y webhook)

Valida estado en MP, busca la `OrdenPagoPro` por referencia, y dentro de una sola `transaction.atomic()` (tarjeta bloqueada): comprueba duplicado (orden pagada / `mp_order_id` / PagoTarjeta), valida monto y moneda CLP contra la ORDEN, extiende N meses, asigna número de fundador (bloqueando la fila de configuración para numerar correlativamente), crea el PagoTarjeta y marca la orden pagada. Referencia sin orden (formato antiguo): error JSON claro (409 en verificar; 200 con `ok: false` en el webhook para que MP no reintente), nunca 500. El pago por Terras de tarjetas básicas no se tocó.

## Pruebas (BD de desarrollo, SIN atomic externo, MP simulado con `requests`; datos de prueba borrados y configuración restaurada)

```
1) planes landing nueva: {'fundador': 9000, 'mensual': 5000, 'semestral': 27000, 'anual': 50000} | cupos: 100/100
2) fundador: orden 9000 (MP recibió 9000) -> activa, vence 2027-04-02 (+6 meses), fundador=1, beneficio hasta 2029-04-02 (vence + 24 meses)
3) fundador vigente: planes {'mensual': 3500, 'semestral': 18900, 'anual': 35000}; se cobra 3500; +1 mes desde el vencimiento; fundador otra vez -> 409
4) fundador vencido 10 días (gracia 5): planes mensual 5000; se cobra 5000; beneficio_hasta=None (pierde el beneficio, conserva su número)
5) cupos agotados: sin plan fundador, cupos 0; crear orden fundador -> 409 y 0 órdenes creadas
6) precio cambiado a 7777 DESPUÉS de crear la orden de 5000 -> 200, activa, 1 pago
7) misma orden confirmada 3 veces (2 retornos + webhook) -> 1 PagoTarjeta, misma fecha
8) monto 4999 vs orden 5000 -> 409, sigue en borrador, 0 pagos, orden pendiente
9) anual: MP recibió 50000, +12 meses
10) básica con Terras: 200, activa, +30 días, monto_terras 5, sin orden Pro
A) referencia antigua sin orden -> 409 con mensaje claro, sin cambios
B) último cupo pagado por dos landings -> ambas activas, números consecutivos (2 y 3)
limpieza: 0 clientes/órdenes de prueba, config restaurada
```

`manage.py check` sin problemas. `makemigrations --check --dry-run`: No changes detected.

## Para tener presente al desplegar

1. Hay que correr `python manage.py migrate` en producción (0011 + 0012). La 0012 deja el precio base en 5000.
2. Sin el frontend 6b, el botón actual paga el plan mensual (5.000, ya no 100). Para otra prueba de $100, bajar `precio_pro_clp` en el admin.
3. La landing 18, pagada antes de este cambio con referencia sin orden registrada, ya no se podría activar por el retorno (409). Si su pago de $100 aún no está activado, habrá que activarla a mano.
4. En desarrollo la migración dejó `precio_pro_clp` en 5000 (estaba en 100).
