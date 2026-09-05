# apps/tarjetas/panel_views.py
"""Endpoints del panel (crear/editar tarjetas) — todos requieren sesión.
El usuario se identifica por su `user_profile_id` de Banexa, resuelto acá
con `apps.cuentas.auth.resolver_perfil_banexa`; no hay usuario local de
Django de por medio (ver ese módulo para el porqué).

Decisión de diseño — Cliente vs. banexa_user_id directo en Tarjeta (ver
PANEL_1.md para el detalle): se mantuvo el modelo `Cliente` tal como quedó
en la Fase A.1 (ya tenía `banexa_user_id`) en vez de colgar `Tarjeta`
directo del id de Banexa. Se recupera o crea perezosamente con
`_obtener_o_crear_cliente` la primera vez que el usuario toca el panel —
sin pedirle nada, sin migración nueva.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .models import Cliente, Tarjeta
from .serializers import MisTarjetasSerializer, TarjetaPanelSerializer

# Campos que PATCH /api/tarjetas/<id>/ puede tocar — todo lo demás del
# request.data se ignora.
# TODO: agregar `imagen` acá cuando exista subida de foto (Panel-2); los
# productos se editan aparte (Panel-3), no por este endpoint.
CAMPOS_EDITABLES = (
    'nombre_mostrado', 'cargo_rubro', 'empresa', 'eslogan', 'tipo', 'plantilla',
    'telefono', 'whatsapp', 'email_contacto', 'sitio_web',
    'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x_twitter',
    'sobre_texto', 'direccion', 'horario',
    'mostrar_contacto', 'mostrar_redes', 'mostrar_sobre', 'mostrar_ubicacion', 'mostrar_productos',
)


def _obtener_o_crear_cliente(perfil_banexa):
    """Recupera (o crea la primera vez) el Cliente de tarjeta-digital
    asociado a este usuario de Banexa. `nombre`/`email` quedan como
    snapshot del primer login — no se sincronizan en los siguientes (fuera
    de alcance de esta fase; Cliente solo existe acá para colgar Tarjetas)."""
    banexa_user_id = str(perfil_banexa['user_profile_id'])
    cliente, _creado = Cliente.objects.get_or_create(
        banexa_user_id=banexa_user_id,
        defaults={
            'origen': 'kabymur',
            'nombre': (perfil_banexa.get('nombre_completo') or perfil_banexa.get('username') or '').strip(),
            'email': perfil_banexa.get('email') or '',
        },
    )
    return cliente


def _obtener_tarjeta_del_cliente(cliente, tarjeta_id):
    """None si la tarjeta no existe O no es de este cliente — a propósito
    no se distingue entre ambos casos (404 en los dos) para no filtrar si
    un id de tarjeta ajena existe."""
    return Tarjeta.objects.filter(pk=tarjeta_id, cliente=cliente).first()


def _mensaje_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        mensajes = [m for lista in exc.message_dict.values() for m in lista]
    else:
        mensajes = list(exc.messages)
    return ' '.join(mensajes) if mensajes else 'Datos inválidos.'


@api_view(['GET'])
@permission_classes([AllowAny])
def mis_tarjetas(request):
    """GET /api/mis-tarjetas/ — lista las tarjetas del usuario autenticado."""
    perfil, error = resolver_perfil_banexa(request)
    if error is not None:
        return error

    cliente = Cliente.objects.filter(banexa_user_id=str(perfil['user_profile_id'])).first()
    tarjetas = cliente.tarjetas.all().order_by('id') if cliente else Tarjeta.objects.none()
    return Response(MisTarjetasSerializer(tarjetas, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def crear_tarjeta(request):
    """POST /api/tarjetas/ — crea una tarjeta nueva (en blanco) para el
    usuario autenticado. El slug se genera solo (Tarjeta.save() ya lo hace
    si viene vacío); el resto de los campos se completan después desde el
    formulario (PATCH /api/tarjetas/<id>/). El límite de 3 por cliente lo
    valida el propio modelo (Tarjeta.clean()) — acá solo se traduce el
    ValidationError a una respuesta HTTP clara."""
    perfil, error = resolver_perfil_banexa(request)
    if error is not None:
        return error

    cliente = _obtener_o_crear_cliente(perfil)

    tarjeta = Tarjeta(cliente=cliente, tipo='persona', plan='kabymur_basico')
    try:
        tarjeta.save()
    except DjangoValidationError as e:
        return Response(
            {'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST
        )

    return Response(MisTarjetasSerializer(tarjeta).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def tarjeta_detalle(request, tarjeta_id):
    """GET /api/tarjetas/<id>/ — todos los datos de una tarjeta propia, para
    precargar el formulario de edición. PATCH — edición parcial, solo los
    campos de CAMPOS_EDITABLES que vengan en el body. En ambos casos, si la
    tarjeta no es del usuario autenticado (o no existe), 404."""
    perfil, error = resolver_perfil_banexa(request)
    if error is not None:
        return error

    cliente = Cliente.objects.filter(banexa_user_id=str(perfil['user_profile_id'])).first()
    tarjeta = _obtener_tarjeta_del_cliente(cliente, tarjeta_id) if cliente else None
    if tarjeta is None:
        return Response({'ok': False, 'error': 'Tarjeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TarjetaPanelSerializer(tarjeta).data)

    # PATCH.
    # TODO: si cambia nombre_mostrado, el slug NO se regenera (se mantiene
    # estable una vez creado) — editarlo a mano será otra feature.
    for campo in CAMPOS_EDITABLES:
        if campo in request.data:
            setattr(tarjeta, campo, request.data[campo])

    try:
        tarjeta.save()
    except DjangoValidationError as e:
        return Response(
            {'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST
        )

    return Response(TarjetaPanelSerializer(tarjeta).data)
