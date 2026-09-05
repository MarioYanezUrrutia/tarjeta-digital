# apps/cuentas/auth.py
"""Helper para vistas de OTRAS apps (ej. apps.tarjetas/panel_views.py) que
necesitan saber quién es el usuario autenticado sin repetir la lógica de
leer la cookie y llamar a Banexa.

A propósito no es un backend de autenticación de DRF ni usa
`permission_classes([IsAuthenticated])`: todo ese sistema asume un usuario
LOCAL (`request.user`, tabla `auth_user`) — acá no hay ninguno, el usuario
vive en Banexa. Cada vista protegida llama a `resolver_perfil_banexa(request)`
al principio y decide qué hacer con el resultado, mismo patrón manual que ya
usa `apps.cuentas.views` para `/auth/me/`.
"""
import requests
from rest_framework.response import Response

from .banexa import banexa_get, borrar_cookie_token, token_de_cookie

MENSAJE_BANEXA_NO_DISPONIBLE = (
    'No se pudo contactar el servicio de autenticación. Intenta de nuevo en un momento.'
)


def resolver_perfil_banexa(request):
    """Resuelve el perfil de Banexa del usuario autenticado a partir de la
    cookie httpOnly.

    Retorna `(perfil, None)` si hay sesión válida — `perfil` es el dict
    crudo que devuelve Banexa en `GET /auth/perfil/` (incluye
    `user_profile_id`, `username`, `email`, `nombre_completo`, etc.) — o
    `(None, Response)` con el error ya armado (401 sin sesión / sesión
    rechazada por Banexa, 502 si Banexa no responde) para que la vista
    simplemente haga `return error`.

    Si Banexa dice que el token ya no sirve (401), borra la cookie local en
    la misma respuesta — igual que hace `apps.cuentas.views.me_view`.
    """
    if not token_de_cookie(request):
        return None, Response({'ok': False, 'error': 'No has iniciado sesión.'}, status=401)

    try:
        resp = banexa_get(request, '/auth/perfil/')
    except requests.RequestException:
        return None, Response({'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=502)

    if resp.status_code == 200:
        return resp.json(), None

    if resp.status_code == 401:
        respuesta = Response(
            {'ok': False, 'error': 'Tu sesión expiró, vuelve a iniciar sesión.'}, status=401
        )
        borrar_cookie_token(respuesta)
        return None, respuesta

    return None, Response({'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=502)
