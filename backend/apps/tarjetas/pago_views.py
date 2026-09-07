# apps/tarjetas/pago_views.py
"""Pago de la suscripción de una tarjeta con Terras reales (Cobro-2).

Mismo patrón de autenticación que panel_views.py/productos_views.py: el
usuario se identifica por su sesión de Banexa (`resolver_perfil_banexa`); la
tarjeta es "del usuario" si su `Cliente` lo es.

CRÍTICO: la tarjeta solo cambia de estado si Banexa confirmó el cobro real
(POST /terras/cobrar-servicio/ con 200) — si Banexa responde error por
cualquier motivo (clave, saldo, lo que sea), la tarjeta NO se toca. El dinero
(Terras) y el estado de la tarjeta nunca deben quedar desincronizados: nunca
activar sin haber cobrado, nunca cobrar sin activar.
"""
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa
from apps.cuentas.banexa import banexa_get, banexa_post

from .models import Cliente
from .panel_views import _obtener_tarjeta_del_cliente

MENSAJE_BANEXA_NO_DISPONIBLE = (
    'No se pudo contactar el servicio de Terras. Intenta de nuevo en un momento.'
)


def _obtener_tarjeta_o_404(request, tarjeta_id):
    """(tarjeta, None) si la tarjeta es del usuario autenticado, o
    (None, Response) con el error ya armado (401 sin sesión, 404 si la
    tarjeta no existe o no es suya — mismo criterio que el resto del panel:
    no se distingue un caso del otro)."""
    perfil, error = resolver_perfil_banexa(request)
    if error is not None:
        return None, error
    cliente = Cliente.objects.filter(banexa_user_id=str(perfil['user_profile_id'])).first()
    tarjeta = _obtener_tarjeta_del_cliente(cliente, tarjeta_id) if cliente else None
    if tarjeta is None:
        return None, Response({'ok': False, 'error': 'Tarjeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return tarjeta, None


@api_view(['GET'])
@permission_classes([AllowAny])
def estado_pago(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/estado-pago/ — precio de la
    suscripción, saldo de Terras del usuario (consultado a Banexa) y si le
    alcanza, más el estado/vencimiento actual de la tarjeta. Si Banexa no
    responde, no revienta: `saldo` queda `None` y `alcanza` en `False`."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    saldo = None
    saldo_disponible = True
    try:
        resp_saldo = banexa_get(request, '/terras/saldo/')
    except requests.RequestException:
        resp_saldo = None

    if resp_saldo is None or resp_saldo.status_code != 200:
        saldo_disponible = False
    else:
        try:
            saldo = int(resp_saldo.json().get('saldo'))
        except (TypeError, ValueError):
            saldo_disponible = False

    precio = settings.TARJETA_PRECIO_TERRAS
    alcanza = bool(saldo_disponible and saldo is not None and saldo >= precio)

    return Response({
        'precio': precio,
        'saldo': saldo,
        'saldo_disponible': saldo_disponible,
        'alcanza': alcanza,
        'estado': tarjeta.estado,
        'fecha_vencimiento': tarjeta.fecha_vencimiento,
        'dias_para_vencer': tarjeta.dias_para_vencer(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def pagar_tarjeta(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/pagar/ — Body: {"clave_privada": "..."}.
    Cobra TARJETA_PRECIO_TERRAS Terras reales vía Banexa
    (POST /terras/cobrar-servicio/) y SOLO si Banexa confirma con 200 activa
    o renueva la tarjeta:
    - Si ya estaba vigente (activa, vencimiento futuro): los
      TARJETA_DIAS_SUSCRIPCION nuevos se suman desde el vencimiento actual,
      no desde ahora — para no perderle días a quien renueva antes de
      vencer.
    - Si estaba vencida/cortada/en borrador: se suman desde ahora.
    Cualquier error de Banexa (clave incorrecta/bloqueada/no configurada,
    saldo insuficiente, lo que sea) se reenvía tal cual al frontend y la
    tarjeta NO se toca.
    """
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    clave_privada = request.data.get('clave_privada') or ''
    if not clave_privada:
        return Response(
            {'ok': False, 'error': 'Debes ingresar tu clave privada.'}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        resp = banexa_post(request, '/terras/cobrar-servicio/', {
            'cantidad': settings.TARJETA_PRECIO_TERRAS,
            'clave_privada': clave_privada,
            'detalle': f'Tarjeta digital - {tarjeta.slug}',
        })
    except requests.RequestException:
        return Response(
            {'ok': False, 'error': MENSAJE_BANEXA_NO_DISPONIBLE}, status=status.HTTP_502_BAD_GATEWAY
        )

    if resp.status_code != 200:
        try:
            datos_error = resp.json()
        except ValueError:
            datos_error = {}
        mensaje = datos_error.get('error') or MENSAJE_BANEXA_NO_DISPONIBLE
        # Banexa devuelve 400 (saldo/tope/clave no configurada) o 403 (clave
        # incorrecta/bloqueada) — se reenvían tal cual; cualquier otra cosa
        # (5xx, cuerpo raro) se traduce a 502, mismo criterio que
        # apps.cuentas.views._reenviar_error_banexa.
        status_code = resp.status_code if resp.status_code in (400, 403, 404) else status.HTTP_502_BAD_GATEWAY
        return Response({'ok': False, 'error': mensaje}, status=status_code)

    # Banexa confirmó el cobro (200) — recién acá se activa/renueva.
    ahora = timezone.now()
    sigue_vigente = tarjeta.fecha_vencimiento and tarjeta.fecha_vencimiento > ahora
    base = tarjeta.fecha_vencimiento if sigue_vigente else ahora
    tarjeta.estado = 'activa'
    tarjeta.fecha_ultimo_pago = ahora
    tarjeta.fecha_vencimiento = base + timedelta(days=settings.TARJETA_DIAS_SUSCRIPCION)
    tarjeta.save()

    return Response({
        'ok': True,
        'estado': tarjeta.estado,
        'fecha_vencimiento': tarjeta.fecha_vencimiento,
        'nuevo_saldo': resp.json().get('nuevo_saldo'),
    })
