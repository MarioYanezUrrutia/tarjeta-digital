# apps/tarjetas/flow.py
"""Cliente mínimo de Flow (Cobro-4) para el cobro en dinero del plan Pro.

Implementa la firma HMAC-SHA256 que exige Flow: se firman todos los
parámetros MENOS 's', ordenados alfabéticamente por nombre, concatenados
como nombreValornombreValor..., y el hash hex se manda en 's'.
Doc: https://developers.flow.cl/api

Este módulo NO decide reglas de negocio (activar suscripción, etc.); solo
habla con Flow. Quien orquesta es el endpoint que lo llama.
"""
import hashlib
import hmac
from urllib.parse import urlencode

import requests
from django.conf import settings


class FlowError(Exception):
    """Falla al comunicarse con Flow o respuesta de error de Flow."""


def _firmar(params):
    """Firma HMAC-SHA256 de los params (sin 's'), ordenados alfabéticamente
    y concatenados como nombreValor. Devuelve el hash hexadecimal."""
    items = sorted((k, v) for k, v in params.items() if k != 's')
    to_sign = ''.join(f'{k}{v}' for k, v in items)
    return hmac.new(
        settings.FLOW_SECRET_KEY.encode(),
        to_sign.encode(),
        hashlib.sha256,
    ).hexdigest()


def _con_firma(params):
    """Devuelve una copia de params con la clave 's' (la firma) agregada."""
    p = dict(params)
    p['s'] = _firmar(p)
    return p


def crear_pago(*, commerce_order, subject, amount, email, url_confirmation, url_return):
    """Crea una orden de pago en Flow (payment/create).

    Devuelve dict con al menos 'url' y 'token'; la URL a la que se debe
    redirigir al pagador es f"{url}?token={token}". Lanza FlowError si Flow
    responde error o si falta configuración.
    """
    if not settings.FLOW_API_KEY or not settings.FLOW_SECRET_KEY:
        raise FlowError('Flow no está configurado (faltan credenciales).')

    params = {
        'apiKey': settings.FLOW_API_KEY,
        'commerceOrder': str(commerce_order),
        'subject': subject,
        'currency': 'CLP',
        'amount': int(amount),
        'email': email,
        'urlConfirmation': url_confirmation,
        'urlReturn': url_return,
    }
    body = urlencode(_con_firma(params))
    try:
        resp = requests.post(
            f'{settings.FLOW_API_URL}/payment/create',
            data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15,
        )
    except requests.RequestException as e:
        raise FlowError(f'No se pudo conectar con Flow: {e}')

    if resp.status_code != 200:
        raise FlowError(f'Flow respondió {resp.status_code}: {resp.text}')
    datos = resp.json()
    if 'url' not in datos or 'token' not in datos:
        raise FlowError(f'Respuesta inesperada de Flow: {datos}')
    return datos


def consultar_estado(token):
    """Consulta el estado de una orden (payment/getStatus) por su token.

    Devuelve el dict de Flow. El campo 'status' == 1 significa PAGADA.
    Lanza FlowError ante fallas de conexión o HTTP.
    """
    if not settings.FLOW_API_KEY or not settings.FLOW_SECRET_KEY:
        raise FlowError('Flow no está configurado (faltan credenciales).')

    params = {'apiKey': settings.FLOW_API_KEY, 'token': token}
    query = urlencode(_con_firma(params))
    try:
        resp = requests.get(f'{settings.FLOW_API_URL}/payment/getStatus?{query}', timeout=15)
    except requests.RequestException as e:
        raise FlowError(f'No se pudo conectar con Flow: {e}')

    if resp.status_code != 200:
        raise FlowError(f'Flow respondió {resp.status_code}: {resp.text}')
    return resp.json()


ESTADO_PAGADA = 1
