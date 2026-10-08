# apps/tarjetas/pasos_views.py
"""Endpoints de gestión del bloque Pro "Cómo funciona" (hasta 4 pasos por
landing) — calcado de faq_views.py. Solo disponible en la landing Pro.

Mismo patrón de autenticación que panel_views.py: el usuario se identifica
por su sesión de Banexa (`resolver_perfil_banexa`), sin usuario local de
Django; un paso es "del usuario" si la tarjeta a la que pertenece lo
es. Un paso de otra persona (o de una tarjeta que no existe) siempre
da 404, sin distinguir los dos casos — mismo criterio que el resto del panel.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .models import MAX_PASOS_POR_TARJETA, Cliente, PasoProceso
from .panel_views import _obtener_tarjeta_del_cliente
from .serializers import PasoSerializer

# Los máximos de caracteres coinciden con el modelo (se responde 400 en español antes de llegar a él).
MAX_TITULO = 60
MAX_TEXTO = 200


def _cliente_autenticado(request):
    """(cliente, None) con sesión Banexa válida (`cliente` es None si el
    usuario nunca tocó el panel de tarjetas y por ende no tiene Cliente
    creado todavía), o (None, Response) con el error ya armado."""
    perfil, error = resolver_perfil_banexa(request)
    if error is not None:
        return None, error
    cliente = Cliente.objects.filter(banexa_user_id=str(perfil['user_profile_id'])).first()
    return cliente, None


def _obtener_tarjeta_o_404(request, tarjeta_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    tarjeta = _obtener_tarjeta_del_cliente(cliente, tarjeta_id) if cliente else None
    if tarjeta is None:
        return None, Response({'ok': False, 'error': 'Tarjeta no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return tarjeta, None


def _obtener_paso_o_404(request, paso_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    paso = (
        PasoProceso.objects.filter(pk=paso_id, tarjeta__cliente=cliente).first() if cliente else None
    )
    if paso is None:
        return None, Response({'ok': False, 'error': 'Paso no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    return paso, None


def _error_de_largo(titulo, texto):
    if titulo is not None and len(titulo) > MAX_TITULO:
        return f'El título no puede superar los {MAX_TITULO} caracteres.'
    if texto is not None and len(texto) > MAX_TEXTO:
        return f'El texto no puede superar los {MAX_TEXTO} caracteres.'
    return None


def _mensaje_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        mensajes = [m for lista in exc.message_dict.values() for m in lista]
    else:
        mensajes = list(exc.messages)
    return ' '.join(mensajes) if mensajes else 'Datos inválidos.'


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def pasos_lista(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/pasos/ — lista, ordenadas por `orden`.
    POST — crea una titulo nueva al final del orden actual."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if request.method == 'GET':
        pasos = tarjeta.pasos.all()
        return Response(PasoSerializer(pasos, many=True, context={'request': request}).data)

    # POST.
    if not tarjeta.es_pro():
        return Response(
            {'ok': False, 'error': 'El bloque "Cómo funciona" solo está disponible en la landing Pro.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if tarjeta.pasos.count() >= MAX_PASOS_POR_TARJETA:
        return Response(
            {'ok': False, 'error': f'Ya alcanzaste el máximo de {MAX_PASOS_POR_TARJETA} pasos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    titulo = (request.data.get('titulo') or '').strip()
    texto = (request.data.get('texto') or '').strip()
    if not titulo or not texto:
        return Response(
            {'ok': False, 'error': 'El título y el texto son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    error_largo = _error_de_largo(titulo, texto)
    if error_largo:
        return Response({'ok': False, 'error': error_largo}, status=status.HTTP_400_BAD_REQUEST)

    orden_maximo = tarjeta.pasos.aggregate(maximo=Max('orden'))['maximo']
    try:
        paso = PasoProceso.objects.create(
            tarjeta=tarjeta,
            titulo=titulo,
            texto=texto,
            orden=(orden_maximo or 0) + 1,
        )
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        PasoSerializer(paso, context={'request': request}).data, status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([AllowAny])
def paso_detalle(request, paso_id):
    """PATCH /api/pasos/<id>/ — edita título/texto. DELETE — borra el
    paso."""
    paso, error = _obtener_paso_o_404(request, paso_id)
    if error is not None:
        return error

    if request.method == 'DELETE':
        paso.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH.
    if 'titulo' in request.data and not (request.data.get('titulo') or '').strip():
        return Response({'ok': False, 'error': 'El título es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
    if 'texto' in request.data and not (request.data.get('texto') or '').strip():
        return Response({'ok': False, 'error': 'El texto es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    error_largo = _error_de_largo(
        (request.data.get('titulo') or '').strip() if 'titulo' in request.data else None,
        (request.data.get('texto') or '').strip() if 'texto' in request.data else None,
    )
    if error_largo:
        return Response({'ok': False, 'error': error_largo}, status=status.HTTP_400_BAD_REQUEST)

    for campo in ('titulo', 'texto'):
        if campo in request.data:
            setattr(paso, campo, request.data[campo])

    try:
        paso.save()
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(PasoSerializer(paso, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def pasos_reordenar(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/pasos/reordenar/ —
    body `{"orden": [id1, id2, ...]}`. La posición en la lista define el
    nuevo `orden` de cada titulo. Todo o nada: si la lista no coincide
    exactamente con las pasos de esta tarjeta, no se toca ninguna."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    ids = request.data.get('orden')
    if not isinstance(ids, list) or not ids:
        return Response({'ok': False, 'error': 'Falta la lista de orden.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        ids = [int(i) for i in ids]
    except (TypeError, ValueError):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe ser de ids numéricos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pasos_por_id = {f.id: f for f in tarjeta.pasos.all()}
    if set(ids) != set(pasos_por_id.keys()):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe incluir exactamente las pasos de esta tarjeta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for posicion, paso_id in enumerate(ids):
        pasos_por_id[paso_id].orden = posicion
    PasoProceso.objects.bulk_update(pasos_por_id.values(), ['orden'])

    pasos = tarjeta.pasos.all()
    return Response(PasoSerializer(pasos, many=True, context={'request': request}).data)
