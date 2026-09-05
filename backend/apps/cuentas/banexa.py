# apps/cuentas/banexa.py
"""Cliente delgado hacia el backend de Banexa (bot_ia).

tarjeta-digital NO tiene su propio sistema de usuarios: autentica contra
Banexa y consulta los datos frescos en cada request. El access token de
Banexa vive ÚNICAMENTE en la cookie httpOnly `COOKIE_TOKEN` — nunca llega al
body de una respuesta ni se guarda en la base de datos de tarjeta-digital.

Reusar `banexa_get`/`banexa_post` para cualquier llamada autenticada futura
hacia Banexa (ej. el cobro de Terras de una tarjeta) — ya resuelven sacar el
token de la cookie del request y mandarlo como Authorization: Bearer.
"""
import requests
from django.conf import settings

COOKIE_TOKEN = 'banexa_token'
# Mismo período que ACCESS_TOKEN_LIFETIME en config.settings de bot_ia (7 días).
COOKIE_MAX_AGE = 60 * 60 * 24 * 7
TIMEOUT_SEGUNDOS = 10


def _url(path):
    return f"{settings.BANEXA_API_URL.rstrip('/')}/{path.lstrip('/')}"


def banexa_post_publico(path, data):
    """POST sin autenticación hacia Banexa — para login/google, donde
    tarjeta-digital todavía no tiene ningún token que reenviar."""
    return requests.post(_url(path), json=data, timeout=TIMEOUT_SEGUNDOS)


def token_de_cookie(request):
    """Access token de Banexa guardado en la cookie httpOnly del request
    actual, o None si no hay sesión."""
    return request.COOKIES.get(COOKIE_TOKEN) or None


def banexa_get(request, path):
    """GET autenticado hacia Banexa, reenviando el token de la cookie de
    `request` como Authorization: Bearer. Retorna None (sin llamar a
    Banexa) si el request no trae cookie — el llamador decide qué hacer,
    normalmente responder 401 sin más."""
    token = token_de_cookie(request)
    if not token:
        return None
    return requests.get(
        _url(path), headers={'Authorization': f'Bearer {token}'}, timeout=TIMEOUT_SEGUNDOS,
    )


def banexa_post(request, path, data=None):
    """POST autenticado hacia Banexa. Mismo patrón que banexa_get — pensado
    para reusarse en el cobro de Terras (ej. pago de una tarjeta) contra
    endpoints como /terras/cobrar-servicio/."""
    token = token_de_cookie(request)
    if not token:
        return None
    return requests.post(
        _url(path), json=data or {}, headers={'Authorization': f'Bearer {token}'},
        timeout=TIMEOUT_SEGUNDOS,
    )


def set_cookie_token(response, token):
    """Guarda el access token de Banexa en la cookie httpOnly tras un login
    exitoso. `secure` se deriva de DEBUG: en dev (http) exigir Secure haría
    que el navegador descarte la cookie; en producción (DEBUG=False, sirve
    por https) sí se exige."""
    response.set_cookie(
        COOKIE_TOKEN,
        token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
    )


def borrar_cookie_token(response):
    """Quita la cookie de sesión local (logout, o token que Banexa rechazó)."""
    response.delete_cookie(COOKIE_TOKEN)
