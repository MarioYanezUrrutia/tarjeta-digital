# apps/tarjetas/mercadopago.py
"""Cliente mínimo de Mercado Pago (Orders API, Checkout Pro) para el cobro
en dinero del plan Pro — reemplazo de Flow (Cobro-4).

A diferencia de Flow (que firma cada request con HMAC propio), Mercado
Pago se autentica con un Bearer token (`MP_ACCESS_TOKEN`) mandado en el
header Authorization — no hace falta firmar nada para crear/consultar una
orden. Doc: https://www.mercadopago.cl/developers/es/docs

Este módulo NO decide reglas de negocio (activar suscripción, etc.); solo
habla con Mercado Pago. Quien orquesta es el endpoint que lo llama.
"""
import uuid

import requests
from django.conf import settings

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


def verificar_firma_webhook(request):
    """TODO: validar x-signature en el paso del webhook, con
    MP_WEBHOOK_SECRET (HMAC sobre el manifest id/request-id/ts que exige
    MP — ver doc de notificaciones). Por ahora siempre True: se implementa
    de verdad recién al construir el webhook, no en este paso aislado."""
    return True


ESTADO_APROBADO = 'processed'  # a confirmar en prueba real
