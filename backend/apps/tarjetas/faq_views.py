# apps/tarjetas/faq_views.py
"""Endpoints de gestión del listado de preguntas frecuentes de una tarjeta
(Panel-3, bloque FAQ) — calcado de testimonios_views.py, sin campo de
imagen (PreguntaFrecuente no tiene).

Mismo patrón de autenticación que panel_views.py: el usuario se identifica
por su sesión de Banexa (`resolver_perfil_banexa`), sin usuario local de
Django; una pregunta es "del usuario" si la tarjeta a la que pertenece lo
es. Una pregunta de otra persona (o de una tarjeta que no existe) siempre
da 404, sin distinguir los dos casos — mismo criterio que el resto del panel.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .models import Cliente, PreguntaFrecuente
from .panel_views import _obtener_tarjeta_del_cliente
from .serializers import FaqSerializer

# Coincide con el límite que ya impone PreguntaFrecuente.clean() en
# models.py — queda acá como constante única para responder 400 antes de
# llegar al ValidationError del modelo, mismo patrón que
# MAX_TESTIMONIOS_POR_TARJETA.
MAX_FAQS_POR_TARJETA = 6


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


def _obtener_faq_o_404(request, faq_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    faq = (
        PreguntaFrecuente.objects.filter(pk=faq_id, tarjeta__cliente=cliente).first() if cliente else None
    )
    if faq is None:
        return None, Response({'ok': False, 'error': 'Pregunta no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return faq, None


def _mensaje_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        mensajes = [m for lista in exc.message_dict.values() for m in lista]
    else:
        mensajes = list(exc.messages)
    return ' '.join(mensajes) if mensajes else 'Datos inválidos.'


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def faqs_lista(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/faqs/ — lista, ordenadas por `orden`.
    POST — crea una pregunta nueva al final del orden actual."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if request.method == 'GET':
        faqs = tarjeta.faqs.all()
        return Response(FaqSerializer(faqs, many=True, context={'request': request}).data)

    # POST.
    if tarjeta.faqs.count() >= MAX_FAQS_POR_TARJETA:
        return Response(
            {'ok': False, 'error': f'Ya alcanzaste el máximo de {MAX_FAQS_POR_TARJETA} preguntas.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pregunta = (request.data.get('pregunta') or '').strip()
    respuesta = (request.data.get('respuesta') or '').strip()
    if not pregunta or not respuesta:
        return Response(
            {'ok': False, 'error': 'La pregunta y la respuesta son obligatorias.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    orden_maximo = tarjeta.faqs.aggregate(maximo=Max('orden'))['maximo']
    try:
        faq = PreguntaFrecuente.objects.create(
            tarjeta=tarjeta,
            pregunta=pregunta,
            respuesta=respuesta,
            orden=(orden_maximo or 0) + 1,
        )
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        FaqSerializer(faq, context={'request': request}).data, status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([AllowAny])
def faq_detalle(request, faq_id):
    """PATCH /api/faqs/<id>/ — edita pregunta/respuesta. DELETE — borra la
    pregunta."""
    faq, error = _obtener_faq_o_404(request, faq_id)
    if error is not None:
        return error

    if request.method == 'DELETE':
        faq.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH.
    if 'pregunta' in request.data and not (request.data.get('pregunta') or '').strip():
        return Response({'ok': False, 'error': 'La pregunta es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)
    if 'respuesta' in request.data and not (request.data.get('respuesta') or '').strip():
        return Response({'ok': False, 'error': 'La respuesta es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)

    for campo in ('pregunta', 'respuesta'):
        if campo in request.data:
            setattr(faq, campo, request.data[campo])

    try:
        faq.save()
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(FaqSerializer(faq, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def faqs_reordenar(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/faqs/reordenar/ —
    body `{"orden": [id1, id2, ...]}`. La posición en la lista define el
    nuevo `orden` de cada pregunta. Todo o nada: si la lista no coincide
    exactamente con las preguntas de esta tarjeta, no se toca ninguna."""
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

    faqs_por_id = {f.id: f for f in tarjeta.faqs.all()}
    if set(ids) != set(faqs_por_id.keys()):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe incluir exactamente las preguntas de esta tarjeta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for posicion, faq_id in enumerate(ids):
        faqs_por_id[faq_id].orden = posicion
    PreguntaFrecuente.objects.bulk_update(faqs_por_id.values(), ['orden'])

    faqs = tarjeta.faqs.all()
    return Response(FaqSerializer(faqs, many=True, context={'request': request}).data)
