# apps/tarjetas/mercadopago.py
"""Cliente mínimo de Mercado Pago (Orders API, Checkout Pro) para el cobro
en dinero del plan Pro (Cobro-5).

Mercado Pago se autentica con un Bearer token (`MP_ACCESS_TOKEN`) mandado
en el header Authorization — no hace falta firmar nada para crear/consultar
una orden. Doc: https://www.mercadopago.cl/developers/es/docs

Este módulo NO decide reglas de negocio (activar suscripción, etc.); solo
habla con Mercado Pago. Quien orquesta es el endpoint que lo llama.
"""
import hashlib
import hmac
import logging
import uuid
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

MP_API_URL = 'https://api.mercadopago.com'


class MercadoPagoError(Exception):
    """Falla al comunicarse con Mercado Pago o respuesta de error de MP."""


def _headers(idempotency_key=None):
    """Headers de autenticación (Bearer) para cualquier request a MP.
    `idempotency_key` solo se incluye si se pasa (lo exige MP en el
    POST de creación de orden, no en el GET de consulta)."""
    if not settings.MP_ACCESS_TOKEN:
        raise MercadoPagoError('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN).')

    headers = {
        'Authorization': f'Bearer {settings.MP_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }
    if idempotency_key is not None:
        headers['X-Idempotency-Key'] = idempotency_key
    return headers


def crear_orden(*, external_reference, subject, amount, email, url_return, url_notification):
    """Crea una orden de pago en Mercado Pago (POST /v1/orders).

    Devuelve dict con al menos 'id' y 'checkout_url'; la URL a la que se
    debe redirigir al pagador es directamente 'checkout_url'. Lanza
    MercadoPagoError si Mercado Pago responde error o si falta
    configuración.
    """
    # CLP no usa decimales, y MP exige el monto como string SIN decimales
    # para esta moneda: "500.00" y el número 500 son rechazados con
    # property_value/property_type, solo "500" devuelve 201 (confirmado
    # con prueba de diagnóstico real contra la Orders API).
    monto = str(int(amount))

    body = {
        'type': 'online',
        'processing_mode': 'manual',
        'total_amount': monto,
        'external_reference': str(external_reference),
        # TODO: el webhook se configura en el panel de MP, no en la orden.
        # notification_url lo rechaza MP tanto en config.online como en la
        # raíz del body (confirmado en prueba real contra la Orders API).
        'payer': {'email': email},
        'items': [
            {'title': subject, 'unit_price': monto, 'quantity': 1},
        ],
        'config': {
            'online': {
                'success_url': url_return,
                'failure_url': url_return,
                'pending_url': url_return,
            },
        },
    }

    idempotency_key = str(uuid.uuid4())
    try:
        resp = requests.post(
            f'{MP_API_URL}/v1/orders',
            json=body,
            headers=_headers(idempotency_key),
            timeout=15,
        )
    except requests.RequestException as e:
        raise MercadoPagoError(f'No se pudo conectar con Mercado Pago: {e}')

    if resp.status_code != 201:
        raise MercadoPagoError(f'Mercado Pago respondió {resp.status_code}: {resp.text}')
    datos = resp.json()
    if 'id' not in datos or 'checkout_url' not in datos:
        raise MercadoPagoError(f'Respuesta inesperada de Mercado Pago: {datos}')
    return datos


def consultar_orden(order_id):
    """Consulta el estado real de una orden (GET /v1/orders/<order_id>).

    Devuelve el dict de la orden. Lanza MercadoPagoError ante fallas de
    conexión o HTTP.
    """
    try:
        resp = requests.get(
            f'{MP_API_URL}/v1/orders/{order_id}',
            headers=_headers(),
            timeout=15,
        )
    except requests.RequestException as e:
        raise MercadoPagoError(f'No se pudo conectar con Mercado Pago: {e}')

    if resp.status_code != 200:
        raise MercadoPagoError(f'Mercado Pago respondió {resp.status_code}: {resp.text}')
    return resp.json()


def buscar_ordenes_por_referencia(external_reference, dias=7):
    """Busca las órdenes recientes con ese external_reference
    (GET /v1/orders exige begin_date/end_date, máximo 1 mes de rango).
    El filtro se repite acá del lado nuestro por si MP ignora el parámetro:
    solo se devuelven órdenes cuyo external_reference coincide EXACTO."""
    # datetime.timezone.utc, NO django.utils.timezone.utc (eliminado en Django 5).
    fin = datetime.now(dt_timezone.utc) + timedelta(days=1)
    inicio = fin - timedelta(days=dias + 1)
    formato = '%Y-%m-%dT%H:%M:%SZ'
    try:
        resp = requests.get(
            f'{MP_API_URL}/v1/orders',
            params={
                'begin_date': inicio.strftime(formato),
                'end_date': fin.strftime(formato),
                'external_reference': external_reference,
            },
            headers=_headers(),
            timeout=15,
        )
    except requests.RequestException as e:
        raise MercadoPagoError(f'No se pudo conectar con Mercado Pago: {e}')

    if resp.status_code != 200:
        raise MercadoPagoError(f'Mercado Pago respondió {resp.status_code}: {resp.text}')
    datos = resp.json().get('data') or []
    return [o for o in datos if o.get('external_reference') == external_reference]


def _firma_x_signature(header):
    """{'ts': ..., 'v1': ...} a partir de 'ts=1742505638683,v1=ced36a...'."""
    partes = {}
    for trozo in (header or '').split(','):
        clave, _, valor = trozo.partition('=')
        if clave.strip() and valor.strip():
            partes[clave.strip()] = valor.strip()
    return partes


def verificar_firma_webhook(request):
    """Valida la firma (header x-signature) de una notificación de MP.

    Según la documentación de MP para notificaciones de Order
    (https://www.mercadopago.com.ar/developers/es/docs/checkout-api-orders/notifications
    — misma mecánica que https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks):
    - x-signature = 'ts=<ts>,v1=<hmac hex>'.
    - Se firma con HMAC-SHA256 y la clave secreta de la app (MP_WEBHOOK_SECRET)
      un "manifest" armado con el id de la notificación (query param `data.id`,
      en minúsculas), el header x-request-id y el `ts`.
    - Se compara el resultado con `v1` en tiempo constante.

    Formato del manifest: la documentación general de webhooks lo define como
    'id:<data.id>;request-id:<x-request-id>;ts:<ts>;'; la página de Orders lo
    presenta con el mismo trío de datos. Se aceptan las dos formas ('id:..;'
    y 'id|request-id|ts') — ambas exigen conocer el secreto, así que aceptar
    las dos no debilita nada. CONFIRMAR con una notificación real de MP y,
    si solo una resulta válida, dejar solo esa.

    Devuelve False (y deja log) si el secreto no está configurado, falta algún
    dato o la firma no coincide: el llamador responde 401 sin procesar nada."""
    secreto = settings.MP_WEBHOOK_SECRET
    if not secreto:
        logger.error('Webhook MP rechazado: MP_WEBHOOK_SECRET no está configurado.')
        return False

    firma = _firma_x_signature(request.headers.get('x-signature'))
    ts, v1 = firma.get('ts'), firma.get('v1')
    request_id = request.headers.get('x-request-id')
    data_id = request.query_params.get('data.id') or (request.data.get('data') or {}).get('id')
    if not (ts and v1 and request_id and data_id):
        logger.warning('Webhook MP rechazado: faltan x-signature/x-request-id/data.id.')
        return False

    data_id = str(data_id).lower()
    manifests = (
        f'id:{data_id};request-id:{request_id};ts:{ts};',
        f'{data_id}|{request_id}|{ts}',
    )
    for manifest in manifests:
        esperado = hmac.new(secreto.encode(), manifest.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(esperado, v1.lower()):
            return True
    logger.warning('Webhook MP rechazado: firma inválida (data.id=%s).', data_id)
    return False


ESTADO_APROBADO = 'processed'  # a confirmar en prueba real
