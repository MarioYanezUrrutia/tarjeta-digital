# apps/cuentas/views.py
"""Backend intermediario hacia Banexa (bot_ia): el navegador del usuario
nunca ve el access token de Banexa, solo la cookie httpOnly que lo guarda.
tarjeta-digital no persiste usuarios ni tokens — cada vista reenvía la
solicitud a Banexa y devuelve al frontend solo lo que no es sensible.
Ver apps.cuentas.banexa para el detalle de la cookie y las llamadas salientes.
"""
import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .banexa import (
    banexa_get,
    banexa_post_publico,
    borrar_cookie_token,
    set_cookie_token,
    token_de_cookie,
)

MENSAJE_BANEXA_NO_DISPONIBLE = (
    'No se pudo contactar el servicio de autenticación. Intenta de nuevo en un momento.'
)


def _reenviar_error_banexa(response_banexa):
    """Traduce una respuesta de error de Banexa a lo que espera el frontend:
    mismo status si es un 4xx conocido (Banexa ya lo pensó para mostrarse),
    o 502 si Banexa devolvió algo inesperado (5xx, cuerpo no-JSON, etc.)."""
    try:
        data = response_banexa.json()
    except ValueError:
        data = {}
    mensaje = data.get('error') or 'No se pudo completar la solicitud.'
    status_code = (
        response_banexa.status_code
        if response_banexa.status_code in (400, 401, 403, 404)
        else status.HTTP_502_BAD_GATEWAY
    )
    return Response({'ok': False, 'error': mensaje}, status=status_code)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """POST /api/auth/login/ — Body: {"username": "...", "password": "..."}
    (username admite email, igual que en Banexa). Reenvía a
    POST {BANEXA_API_URL}/auth/login/; si Banexa autentica, el access token
    queda SOLO en la cookie httpOnly — el body de la respuesta nunca lo
    incluye."""
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response(
            {'ok': False, 'error': 'Debes indicar usuario y contraseña.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        resp = banexa_post_publico('/auth/login/', {'username': username, 'password': password})
    except requests.RequestException:
        return Response(
            {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
        )

    if resp.status_code != 200:
        return _reenviar_error_banexa(resp)

    data = resp.json()
    respuesta = Response({'ok': True, 'user': data.get('user')})
    set_cookie_token(respuesta, data['access'])
    return respuesta


@api_view(['POST'])
@permission_classes([AllowAny])
def registro_view(request):
    """POST /api/auth/registro/ — Body: {username, email, password,
    password_confirm, primer_nombre, apellido_paterno, cod_tel_pais_wp,
    cod_tel_wp, whatsapp_persona}. Reenvía tal cual a
    POST {BANEXA_API_URL}/auth/registro/ — Banexa valida todo (contraseñas
    coinciden, username/email/whatsapp únicos, nombres válidos);
    tarjeta-digital solo hace de puente, no repite esas validaciones.

    NO hace login automático tras registrar: el usuario recién creado queda
    en Banexa (todo el ecosistema Kabymur) y debe iniciar sesión después con
    /api/auth/login/ — igual que el propio registro de Banexa hoy. Se eligió
    así por ser lo más simple y no duplicar la lógica de login acá.

    Si Banexa devuelve 201: {ok: true, message: '...'}. Si devuelve 400 con
    errores de validación (formato DRF: {"campo": ["mensaje", ...]}), se
    reenvían tal cual bajo {ok: false, errors: {...}} con el mismo status,
    para que el formulario los muestre campo por campo.
    """
    campos = (
        'username', 'email', 'password', 'password_confirm',
        'primer_nombre', 'apellido_paterno',
        'cod_tel_pais_wp', 'cod_tel_wp', 'whatsapp_persona',
    )
    payload = {campo: request.data.get(campo) for campo in campos if request.data.get(campo) is not None}

    try:
        resp = banexa_post_publico('/auth/registro/', payload)
    except requests.RequestException:
        return Response(
            {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
        )

    if resp.status_code == 201:
        data = resp.json()
        return Response({'ok': True, 'message': data.get('message')}, status=status.HTTP_201_CREATED)

    try:
        errores = resp.json()
    except ValueError:
        errores = {}

    if resp.status_code == 400 and errores:
        return Response({'ok': False, 'errors': errores}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """POST /api/auth/google/ — Body: {"token": "..."} (access token de
    Google). Mismo manejo que login_view, reenviando a
    POST {BANEXA_API_URL}/auth/google/."""
    token_google = request.data.get('token')
    if not token_google:
        return Response(
            {'ok': False, 'error': 'Falta el token de Google.'}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        resp = banexa_post_publico('/auth/google/', {'token': token_google})
    except requests.RequestException:
        return Response(
            {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
        )

    if resp.status_code != 200:
        return _reenviar_error_banexa(resp)

    data = resp.json()
    respuesta = Response({'ok': True, 'user': data.get('user')})
    set_cookie_token(respuesta, data['access'])
    return respuesta


@api_view(['GET'])
@permission_classes([AllowAny])
def me_view(request):
    """GET /api/auth/me/ — usa el token de la cookie httpOnly para pedirle a
    Banexa el perfil vigente del usuario (GET {BANEXA_API_URL}/auth/perfil/).
    tarjeta-digital no guarda nada de esto, lo consulta cada vez. Si Banexa
    dice que el token ya no sirve (401), se borra la cookie local."""
    if not token_de_cookie(request):
        return Response({'ok': False}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        resp = banexa_get(request, '/auth/perfil/')
    except requests.RequestException:
        return Response(
            {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
        )

    if resp.status_code == 200:
        return Response({'ok': True, 'user': resp.json()})

    if resp.status_code == 401:
        respuesta = Response({'ok': False}, status=status.HTTP_401_UNAUTHORIZED)
        borrar_cookie_token(respuesta)
        return respuesta

    return Response(
        {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """POST /api/auth/logout/ — borra la cookie local. Banexa no expone un
    endpoint para invalidar el token del lado del servidor; sigue siendo
    válido hasta que expire por su cuenta, tarjeta-digital simplemente deja
    de guardarlo."""
    respuesta = Response({'ok': True})
    borrar_cookie_token(respuesta)
    return respuesta
