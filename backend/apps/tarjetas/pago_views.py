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
import functools
import logging
import time
from datetime import timedelta
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa
from apps.cuentas.banexa import banexa_get, banexa_post

from . import mercadopago as mp
from . import planes as pl
from .correos import correo_pago_confirmado
from .models import Cliente, ConfiguracionTarjetas, OrdenPagoPro, PagoTarjeta, Tarjeta
from .panel_views import _obtener_tarjeta_del_cliente

logger = logging.getLogger(__name__)

MENSAJE_BANEXA_NO_DISPONIBLE = (
    'No se pudo contactar el servicio de Terras. Intenta de nuevo en un momento.'
)

# Único lugar donde se reconoce el error "el usuario nunca creó su clave
# privada": Banexa lo informa con un 400 y este texto (apps/terras/views.py
# de bot_ia). Si Banexa cambia ese mensaje, se ajusta SOLO esta constante.
BANEXA_MSG_SIN_CLAVE = 'primero debes crear tu clave privada'
MENSAJE_SIN_CLAVE = 'Para pagar con Terras necesitas tu clave privada de Banexa.'


def _es_error_sin_clave(status_code, mensaje):
    return status_code == 400 and BANEXA_MSG_SIN_CLAVE in (mensaje or '').lower()


MENSAJE_ORDEN_DESCONOCIDA = (
    'Este pago no tiene una orden registrada (formato antiguo o referencia desconocida). '
    'Contáctanos con tu comprobante de Mercado Pago.'
)

MENSAJE_ERROR_PAGO_INTERNO = (
    'Ocurrió un error al procesar el pago. Si ya pagaste, no se pierde: '
    'vuelve a revisar en unos minutos o contáctanos.'
)


def _sin_500_mudo(vista):
    """Cualquier excepción inesperada de una vista de pago MP queda en el log
    con su traceback completo (logger.exception) y el cliente recibe un JSON
    con un mensaje claro en vez de un 500 sin explicación. Va por DEBAJO de
    @api_view."""
    @functools.wraps(vista)
    def envoltura(request, *args, **kwargs):
        try:
            return vista(request, *args, **kwargs)
        except Exception:
            logger.exception('Error inesperado en %s (args=%s)', vista.__name__, kwargs)
            return Response(
                {'ok': False, 'error': MENSAJE_ERROR_PAGO_INTERNO},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    return envoltura


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

    precio = ConfiguracionTarjetas.obtener().precio_terras
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
    Cobra el precio configurado (`ConfiguracionTarjetas.obtener().
    precio_terras` — editable desde el admin, ya no una constante fija)
    en Terras reales vía Banexa (POST /terras/cobrar-servicio/) y SOLO si
    Banexa confirma con 200 activa o renueva la tarjeta:
    - Si ya estaba vigente (activa, vencimiento futuro): los días de
      suscripción configurados se suman desde el vencimiento actual, no
      desde ahora — para no perderle días a quien renueva antes de vencer.
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

    config = ConfiguracionTarjetas.obtener()

    try:
        resp = banexa_post(request, '/terras/cobrar-servicio/', {
            'cantidad': config.precio_terras,
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
        if _es_error_sin_clave(resp.status_code, mensaje):
            return Response({
                'ok': False,
                'codigo': 'sin_clave_privada',
                'detail': MENSAJE_SIN_CLAVE,
                'error': MENSAJE_SIN_CLAVE,
                'url_clave': settings.BANEXA_URL_CLAVE,
            }, status=status.HTTP_400_BAD_REQUEST)
        # Banexa devuelve 400 (saldo/tope/clave no configurada) o 403 (clave
        # incorrecta/bloqueada) — se reenvían tal cual; cualquier otra cosa
        # (5xx, cuerpo raro) se traduce a 502, mismo criterio que
        # apps.cuentas.views._reenviar_error_banexa.
        status_code = resp.status_code if resp.status_code in (400, 403, 404) else status.HTTP_502_BAD_GATEWAY
        return Response({'ok': False, 'error': mensaje}, status=status_code)

    # Banexa confirmó el cobro (200) — recién acá se activa/renueva y se
    # registra el pago (fuente de verdad de las estadísticas de ingresos).
    ahora = timezone.now()
    sigue_vigente = tarjeta.fecha_vencimiento and tarjeta.fecha_vencimiento > ahora
    base = tarjeta.fecha_vencimiento if sigue_vigente else ahora
    tarjeta.estado = 'activa'
    tarjeta.fecha_ultimo_pago = ahora
    tarjeta.fecha_vencimiento = base + timedelta(days=config.dias_suscripcion)
    tarjeta.save()
    PagoTarjeta.objects.create(tarjeta=tarjeta, monto_terras=config.precio_terras)
    correo_pago_confirmado(tarjeta)

    return Response({
        'ok': True,
        'estado': tarjeta.estado,
        'fecha_vencimiento': tarjeta.fecha_vencimiento,
        'nuevo_saldo': resp.json().get('nuevo_saldo'),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@_sin_500_mudo
def planes_pro(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/planes-pro/ — planes de pago disponibles
    HOY para esta landing Pro (nombre, meses, monto, ahorro y, en el plan
    Fundador, los cupos que quedan). Los montos los calcula siempre el
    servidor (apps/tarjetas/planes.py); el frontend solo los muestra."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error
    if not tarjeta.es_pro():
        return Response({'ok': False, 'error': 'Esta landing no es Pro.'}, status=status.HTTP_400_BAD_REQUEST)
    ahora = timezone.now()
    config = ConfiguracionTarjetas.obtener()
    # Solo de lectura: hasta cuándo rige el precio fundador (None si no rige).
    precio_hasta = tarjeta.fundador_precio_hasta if pl.beneficio_fundador_activo(tarjeta, config, ahora) else None
    return Response({
        'planes': pl.calcular_planes(tarjeta, ahora, config),
        'fundador_precio_hasta': precio_hasta,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@_sin_500_mudo
def cupos_fundador(request):
    """GET /api/cupos-fundador/ — público (sin login): cupos del plan Fundador."""
    config = ConfiguracionTarjetas.obtener()
    meses = config.fundador_meses
    # Lo que cuesta al mes el plan Fundador (redondeado): lo muestra el panel.
    equivalente = (config.fundador_precio_clp + meses // 2) // meses if meses > 0 else 0
    return Response({
        'cupos_total': config.fundador_cupos,
        'cupos_restantes': pl.cupos_fundador_restantes(config),
        'equivalente_mensual': equivalente,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@_sin_500_mudo
def crear_pago_mp(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/pagar-mp/ — Body: {"plan": "fundador"
    |"mensual"|"semestral"|"anual"} (por defecto "mensual"). Valida que el
    plan esté disponible para la landing, guarda una OrdenPagoPro con el monto
    y los meses calculados en el servidor y crea la orden en Mercado Pago por
    ESE monto. No activa nada acá: eso lo hace la confirmación (retorno o
    webhook) cuando MP confirme el pago de verdad."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if not tarjeta.es_pro():
        return Response({'ok': False, 'error': 'Esta tarjeta no es Pro.'}, status=status.HTTP_400_BAD_REQUEST)

    if ConfiguracionTarjetas.obtener().precio_pro_clp <= 0:
        return Response(
            {'ok': False, 'error': 'El precio del plan Pro no está configurado.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan_id = str(request.data.get('plan') or pl.PLAN_MENSUAL)
    if plan_id not in pl.NOMBRES:
        return Response({'ok': False, 'error': 'Plan inválido.'}, status=status.HTTP_400_BAD_REQUEST)
    plan = pl.plan_disponible(tarjeta, plan_id, timezone.now())
    if plan is None:
        return Response(
            {'ok': False, 'error': 'Este plan no está disponible para tu landing.'},
            status=status.HTTP_409_CONFLICT,
        )

    # El formato 'pro-<id>-<dígitos>' lo parsea también la página de retorno.
    external_reference = f'pro-{tarjeta.id}-{int(time.time() * 1000)}'
    orden = OrdenPagoPro.objects.create(
        tarjeta=tarjeta, referencia=external_reference, plan=plan['id'],
        meses=plan['meses'], monto_clp=plan['monto'],
    )

    # El helper hoy ignora url_notification (el webhook se registra en el
    # panel de MP, ver mercadopago.py); se arma igual para no cambiar firma.
    from django.conf import settings as dj
    conf_path = f"/{dj.URL_PREFIX}pagos/mercadopago/webhook/"
    url_notification = request.build_absolute_uri(conf_path)
    url_return = f"{dj.PUBLIC_BASE_URL}/pago/mp/retorno?ref={external_reference}"

    email = (tarjeta.email_contacto or '').strip() or 'sin-correo@kabymur.com'
    subject = f"Plan Pro {plan['nombre']} - {tarjeta.nombre_mostrado or tarjeta.slug}"

    try:
        datos = mp.crear_orden(
            external_reference=external_reference,
            subject=subject,
            amount=plan['monto'],
            email=email,
            url_return=url_return,
            url_notification=url_notification,
        )
    except mp.MercadoPagoError as e:
        orden.delete()  # no se llegó a cobrar nada: no dejar la orden huérfana
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({'ok': True, 'url': datos['checkout_url'], 'plan': plan['id'], 'monto': plan['monto']})


def _clasificar_orden_mp(order):
    """'aprobado' | 'rechazado' | 'pendiente' según la orden REAL que
    devolvió la API de MP (nunca según parámetros de URL ni del aviso)."""
    estado = order.get('status')
    if estado == mp.ESTADO_APROBADO:
        detalle = order.get('status_detail')
        return 'aprobado' if detalle in (None, '', 'accredited') else 'pendiente'
    if estado in ('failed', 'canceled', 'cancelled', 'expired', 'refunded', 'rejected'):
        return 'rechazado'
    return 'pendiente'


def _monto_clp_valido(order, monto_esperado):
    """True si la orden de MP es por exactamente `monto_esperado` CLP — el
    monto de la OrdenPagoPro guardada al iniciar el pago, no el precio
    vigente en la configuración. La moneda, si MP la informa, debe ser CLP."""
    if monto_esperado <= 0:
        return False
    for clave in ('currency', 'currency_id'):
        moneda = order.get(clave)
        if moneda and str(moneda).upper() != 'CLP':
            return False
    try:
        return Decimal(str(order.get('total_amount'))) == Decimal(monto_esperado)
    except (InvalidOperation, TypeError, ValueError):
        return False


def _tarjeta_id_de_referencia(external_reference):
    """'pro-<id>-<timestamp>' -> id (int) o None."""
    partes = (external_reference or '').split('-')
    if len(partes) != 3 or partes[0] != 'pro':
        return None
    try:
        return int(partes[1])
    except ValueError:
        return None


def _activar_pro_desde_orden(order_id, order):
    """Punto único de activación del plan Pro por Mercado Pago, usado por el
    webhook y por la verificación al volver del checkout. `order` es la
    orden recién consultada a la API de MP. Devuelve (resultado, tarjeta):
      'activada' | 'ya_procesado' | 'no_aprobado' | 'monto_invalido'
      | 'orden_desconocida' | 'no_encontrada' | 'no_pro'

    - Se valida contra la OrdenPagoPro guardada al iniciar el pago (su monto
      y sus meses), no contra la configuración de hoy.
    - Todo (PagoTarjeta + estado + vigencia + número de fundador + orden
      pagada) ocurre en UNA transacción: o queda todo o no queda nada.
    - Idempotente: la tarjeta se bloquea (select_for_update), y el chequeo de
      duplicado (orden ya pagada / mp_order_id único / PagoTarjeta) corre
      ya dentro del bloqueo."""
    if _clasificar_orden_mp(order) != 'aprobado':
        return 'no_aprobado', None

    referencia = order.get('external_reference') or ''
    tarjeta_id = (
        OrdenPagoPro.objects.filter(referencia=referencia).values_list('tarjeta_id', flat=True).first()
    )
    if tarjeta_id is None:
        logger.warning('Orden MP %s aprobada con referencia sin OrdenPagoPro: %r', order.get('id'), referencia)
        return 'orden_desconocida', None

    with transaction.atomic():
        tarjeta = Tarjeta.objects.select_for_update().filter(pk=tarjeta_id).first()
        if tarjeta is None:
            return 'no_encontrada', None
        if not tarjeta.es_pro():
            return 'no_pro', tarjeta
        orden = OrdenPagoPro.objects.select_for_update().get(referencia=referencia)

        if (
            orden.estado == 'pagada'
            or OrdenPagoPro.objects.filter(mp_order_id=str(order_id)).exists()
            or PagoTarjeta.objects.filter(flow_order=str(order_id)).exists()
        ):
            return 'ya_procesado', tarjeta

        if not _monto_clp_valido(order, orden.monto_clp):
            logger.warning(
                'Orden MP %s aprobada pero con monto/moneda distintos a la orden %s (esperado %s CLP)',
                order.get('id'), orden.referencia, orden.monto_clp,
            )
            return 'monto_invalido', tarjeta

        config = ConfiguracionTarjetas.obtener()
        ahora = timezone.now()

        # Un fundador que ya no cumple las condiciones (terminó el período
        # del beneficio o dejó vencer más allá de la gracia) lo pierde.
        if (
            tarjeta.numero_fundador is not None
            and tarjeta.fundador_precio_hasta is not None
            and not pl.beneficio_fundador_activo(tarjeta, config, ahora)
        ):
            tarjeta.fundador_precio_hasta = None

        sigue_vigente = tarjeta.fecha_vencimiento and tarjeta.fecha_vencimiento > ahora
        base = tarjeta.fecha_vencimiento if sigue_vigente else ahora
        nuevo_vencimiento = pl.sumar_meses(base, orden.meses)

        if orden.plan == pl.PLAN_FUNDADOR and tarjeta.numero_fundador is None:
            # Se serializa la numeración bloqueando la fila de configuración:
            # dos pagos simultáneos del último cupo reciben números
            # consecutivos (se respeta a ambos, aunque pasen del cupo).
            config = ConfiguracionTarjetas.objects.select_for_update().get(pk=config.pk)
            maximo = Tarjeta.objects.aggregate(m=Max('numero_fundador'))['m'] or 0
            tarjeta.numero_fundador = maximo + 1
            tarjeta.fundador_precio_hasta = pl.sumar_meses(nuevo_vencimiento, config.fundador_renovacion_meses)

        tarjeta.estado = 'activa'
        tarjeta.fecha_ultimo_pago = ahora
        tarjeta.fecha_vencimiento = nuevo_vencimiento
        tarjeta.save()

        PagoTarjeta.objects.create(
            tarjeta=tarjeta,
            monto_terras=None,
            monto_clp=orden.monto_clp,
            medio='mercadopago',
            flow_order=str(order_id),
        )
        orden.estado = 'pagada'
        orden.mp_order_id = str(order_id)
        orden.save(update_fields=['estado', 'mp_order_id'])

    try:
        correo_pago_confirmado(tarjeta)
    except Exception:
        pass  # el correo no debe tumbar la confirmación del pago

    logger.info(
        'Landing Pro %s activada por la orden MP %s (plan %s, %s meses, $%s)',
        tarjeta.id, order_id, orden.plan, orden.meses, orden.monto_clp,
    )
    return 'activada', tarjeta


@api_view(['POST'])
@permission_classes([AllowAny])
@_sin_500_mudo
def confirmar_pago_mp(request):
    """Webhook público que Mercado Pago invoca tras un evento de pago.
    Regla de oro: NO confiar en el aviso; se re-consulta la orden real a MP
    (consultar_orden) y solo si MP dice que está aprobada, por el monto
    esperado en CLP, se activa (ver _activar_pro_desde_orden, idempotente).

    Devuelve 200 siempre que el procesamiento sea correcto o no haya nada
    que hacer (para que MP no reintente de más). 401 si la firma no valida y
    500 si no se pudo consultar la orden (para que MP sí reintente)."""
    if not mp.verificar_firma_webhook(request):
        return Response({'ok': False, 'error': 'Firma inválida'}, status=status.HTTP_401_UNAUTHORIZED)

    # MP manda el id de la orden de formas distintas según el tipo de
    # notificación (webhook v1, query params, etc.) — se prueban las
    # variantes conocidas en orden.
    order_id = (
        (request.data.get('data') or {}).get('id')
        or request.data.get('id')
        or request.query_params.get('id')
        or request.query_params.get('data.id')
    )
    if not order_id:
        return Response({'ok': True, 'info': 'sin id'})

    try:
        order = mp.consultar_orden(order_id)
    except mp.MercadoPagoError as e:
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    resultado, _tarjeta = _activar_pro_desde_orden(order_id, order)
    logger.info('Webhook MP: orden %s -> %s', order_id, resultado)
    if resultado == 'activada':
        return Response({'ok': True, 'pagada': True})
    if resultado == 'ya_procesado':
        return Response({'ok': True, 'info': 'ya procesado'})
    if resultado == 'no_aprobado':
        return Response({'ok': True, 'info': f"estado no aprobado: {order.get('status')}"})
    if resultado == 'orden_desconocida':
        # 200 (no 5xx) para que MP no reintente algo que no va a cambiar.
        return Response({'ok': False, 'error': MENSAJE_ORDEN_DESCONOCIDA})
    # monto/moneda inválidos, referencia rara, tarjeta inexistente o no Pro:
    # nada que activar; 200 para que MP no reintente algo que no va a cambiar.
    return Response({'ok': True, 'info': resultado})


@api_view(['POST'])
@permission_classes([AllowAny])
@_sin_500_mudo
def verificar_pago_mp(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/verificar-pago-mp/ — Body: {"ref":
    "pro-<id>-<ts>"}. Lo llama la página de retorno desde Mercado Pago (en
    desarrollo el webhook no puede llegar a localhost). `ref` solo sirve para
    BUSCAR la orden en MP; el resultado sale siempre de lo que MP responde
    sobre esa orden (estado, monto, referencia), nunca de la URL. Comparte
    _activar_pro_desde_orden con el webhook, por lo que confirmar dos veces
    (o retorno + webhook) extiende la vigencia una sola vez.

    Responde {'ok': True, 'resultado': 'aprobado'|'rechazado'|'pendiente'
    |'no_encontrado', 'estado', 'fecha_vencimiento', 'slug'}."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error
    if not tarjeta.es_pro():
        return Response({'ok': False, 'error': 'Esta landing no es Pro.'}, status=status.HTTP_400_BAD_REQUEST)

    ref = str(request.data.get('ref') or '')
    if _tarjeta_id_de_referencia(ref) != tarjeta.id:
        return Response({'ok': False, 'error': 'Referencia de pago inválida.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ordenes = mp.buscar_ordenes_por_referencia(ref)
    except mp.MercadoPagoError as e:
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    def respuesta(resultado):
        tarjeta.refresh_from_db()
        return Response({
            'ok': True,
            'resultado': resultado,
            'estado': tarjeta.estado,
            'fecha_vencimiento': tarjeta.fecha_vencimiento,
            'slug': tarjeta.slug,
        })

    if not ordenes:
        return respuesta('no_encontrado')

    # Se consulta cada orden por su id (la búsqueda puede traer datos
    # parciales) y se prefiere una aprobada.
    consultadas = []
    for resumen in ordenes:
        try:
            consultadas.append(mp.consultar_orden(resumen['id']))
        except (mp.MercadoPagoError, KeyError) as e:
            return Response({'ok': False, 'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    for order in consultadas:
        if _clasificar_orden_mp(order) == 'aprobado':
            resultado, _t = _activar_pro_desde_orden(order['id'], order)
            logger.info('Verificar MP: orden %s (tarjeta %s) -> %s', order['id'], tarjeta.id, resultado)
            if resultado in ('activada', 'ya_procesado'):
                return respuesta('aprobado')
            if resultado == 'orden_desconocida':
                return Response({'ok': False, 'error': MENSAJE_ORDEN_DESCONOCIDA}, status=status.HTTP_409_CONFLICT)
            return Response(
                {'ok': False, 'error': 'No se pudo confirmar el pago. Contáctanos con tu comprobante.'},
                status=status.HTTP_409_CONFLICT,
            )

    if any(_clasificar_orden_mp(o) == 'pendiente' for o in consultadas):
        return respuesta('pendiente')
    return respuesta('rechazado')
