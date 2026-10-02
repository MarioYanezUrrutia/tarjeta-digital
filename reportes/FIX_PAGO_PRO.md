# Fix: pago Pro cobrado pero landing sin activar (500 en verificar-pago-mp)

## Causa real

NO era `select_for_update`: ya estaba dentro de `transaction.atomic()` en `_activar_pro_desde_orden`.

La causa era `mercadopago.buscar_ordenes_por_referencia`, que usaba `django.utils.timezone.utc`. Esa constante se eliminó en Django 5 (producción y dev usan 6.1.1) y lanzaba `AttributeError` antes de consultar a MP, o sea antes de llegar a la activación. Por eso el endpoint respondía 500.

Por qué las pruebas del paso 5 no lo vieron: mockeaban `mp.buscar_ordenes_por_referencia` entera, así que ese código nunca corrió. Las nuevas pruebas simulan solo `requests.get`, de modo que corre el código real de búsqueda, y no usan `atomic` externo.

Consecuencia del bug: falló antes de crear nada. No quedó ningún `PagoTarjeta` y la landing 18 sigue en borrador, así que el chequeo de duplicado NO bloquea ese pago. Tras desplegar el fix, basta con volver a abrir `/pago/mp/retorno?ref=...` (o apretar "Revisar de nuevo") y se activa.

## Cambios

- `mercadopago.py`: fechas con `datetime.timezone.utc`.
- `pago_views.py`: decorador `_sin_500_mudo` en `crear_pago_mp`, `confirmar_pago_mp` y `verificar_pago_mp`. Cualquier excepción inesperada queda con traceback completo en el log (`logger.exception`) y el cliente recibe JSON con un error claro. También hay `logger.info/warning` de cada activación y de cada orden aprobada con monto inesperado.
- `settings.py`: `LOGGING` con handler a stderr para `django.request` (ERROR) y `apps.tarjetas` (INFO), vigente con DEBUG=False, así que sale en el log de Passenger.
- Atomicidad: la activación (tarjeta.save + PagoTarjeta.create) ya ocurre completa dentro de `transaction.atomic()`; la prueba 4 lo demuestra (falla al crear el pago, la tarjeta queda en borrador sin pagos, y el reintento funciona).
- Sin migraciones.

## Pruebas (BD de desarrollo, SIN atomic externo, endpoint real vía `django.test.Client`, `requests.get` simulado; datos de prueba borrados al final)

Antes del fix (mismo script):
```
1) aprobado: HTTP 500 (no JSON) | estado: borrador | pagos: 0
```
(y el log mostraba `AttributeError: module 'django.utils.timezone' has no attribute 'utc'`).

Después del fix:
```
1) aprobado: HTTP 200 aprobado | estado: activa | pagos: 1
2) confirmar de nuevo: HTTP 200 aprobado | misma fecha: True | pagos: 1
3) MP caido: HTTP 502 {'ok': False, 'error': 'No se pudo conectar con Mercado Pago: boom'} | estado: borrador | pagos: 0
4) falla a mitad de la activacion: HTTP 500 {'ok': False, 'error': 'Ocurrió un error al procesar el pago...'} | estado: borrador | pagos: 0
5) reintento tras esa falla: HTTP 200 aprobado | estado: activa | pagos: 1
6) rechazado: HTTP 200 rechazado | estado: borrador | pagos: 0
limpieza: clientes de prueba restantes = 0
```

`manage.py check`: sin problemas. `makemigrations --check --dry-run`: sin cambios.

## Resto de pago_views.py

Revisado: `crear_pago_mp` y el webhook ahora tienen el mismo envoltorio con logging. `pagar_tarjeta` (Terras) y las vistas de Flow no usan nada de lo que falló y no se tocaron.

## Comando de diagnóstico para el servidor (solo lectura, sin modificar la BD ni imprimir el token)

Funciona con el código ACTUAL del servidor (no depende del fix). Pegar en la carpeta backend/ con el venv activo:

```
python manage.py shell -c "
import traceback, requests
from datetime import datetime, timedelta, timezone
from django.conf import settings
from apps.tarjetas.models import Tarjeta, PagoTarjeta, ConfiguracionTarjetas
ID = 18
try:
    t = Tarjeta.objects.get(pk=ID)
    print('TARJETA', t.id, '| plan:', t.plan, '| estado:', t.estado, '| vence:', t.fecha_vencimiento, '| ultimo pago:', t.fecha_ultimo_pago)
    print('PRECIO CONFIGURADO (CLP):', ConfiguracionTarjetas.obtener().precio_pro_clp)
    pagos = list(PagoTarjeta.objects.filter(tarjeta_id=ID))
    print('PAGOS:', len(pagos))
    for p in pagos: print('  pago', p.id, p.medio, 'clp:', p.monto_clp, 'order:', p.flow_order, p.fecha)
    fin = datetime.now(timezone.utc) + timedelta(days=1)
    ini = fin - timedelta(days=8)
    f = '%Y-%m-%dT%H:%M:%SZ'
    r = requests.get('https://api.mercadopago.com/v1/orders', params={'begin_date': ini.strftime(f), 'end_date': fin.strftime(f)}, headers={'Authorization': 'Bearer ' + settings.MP_ACCESS_TOKEN}, timeout=20)
    print('BUSQUEDA MP: HTTP', r.status_code)
    datos = r.json().get('data') or []
    print('ordenes en 8 dias:', len(datos))
    for o in datos:
        ref = o.get('external_reference') or ''
        if ref.startswith('pro-' + str(ID) + '-'):
            print('  ORDEN id:', o.get('id'), '| status:', o.get('status'), '| detail:', o.get('status_detail'), '| monto:', o.get('total_amount'), '| moneda:', o.get('currency') or o.get('currency_id'), '| ref:', ref)
except Exception:
    traceback.print_exc()
"
```

Lo que debe verse: la tarjeta 18 en `borrador` con 0 pagos y una ORDEN con `status: processed`, `monto: 100.00`, `moneda: CLP`. Si el `status`/`detail` son otros, hay que ajustar `ESTADO_APROBADO` / `status_detail` antes de reintentar.

## Después de desplegar

1. Reiniciar Passenger. 2. Abrir `https://tarjeta.kabymur.com/pago/mp/retorno?ref=<la ref de la orden>` con la sesión iniciada; debería decir "¡Tu landing está publicada!". 3. Si falla, ahora el error queda en el log de Passenger con traceback.
