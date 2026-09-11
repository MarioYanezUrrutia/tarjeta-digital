# apps/tarjetas/testimonios_views.py
"""Endpoints de gestión del listado de testimonios de una tarjeta (Panel-3,
bloque Testimonios) — calcado de noticias_views.py.

Mismo patrón de autenticación que panel_views.py: el usuario se identifica
por su sesión de Banexa (`resolver_perfil_banexa`), sin usuario local de
Django; un testimonio es "del usuario" si la tarjeta a la que pertenece lo
es. Un testimonio de otra persona (o de una tarjeta que no existe) siempre
da 404, sin distinguir los dos casos — mismo criterio que el resto del panel.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .imagenes import MAX_TAMANO_IMAGEN_BYTES, procesar_imagen_tarjeta
from .models import Cliente, Testimonio
from .panel_views import _obtener_tarjeta_del_cliente
from .serializers import TestimonioSerializer

# Coincide con el límite que ya impone Testimonio.clean() en models.py —
# queda acá como constante única para responder 400 antes de llegar al
# ValidationError del modelo, mismo patrón que MAX_NOTICIAS_POR_TARJETA.
MAX_TESTIMONIOS_POR_TARJETA = 6


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


def _obtener_testimonio_o_404(request, testimonio_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    testimonio = (
        Testimonio.objects.filter(pk=testimonio_id, tarjeta__cliente=cliente).first() if cliente else None
    )
    if testimonio is None:
        return None, Response(
            {'ok': False, 'error': 'Testimonio no encontrado'}, status=status.HTTP_404_NOT_FOUND,
        )
    return testimonio, None


def _procesar_imagen_testimonio(archivo):
    """(contenido_jpg, None) o (None, Response 400) — mismas reglas que la
    imagen de noticia (Panel-3): <=5MB de entrada, recorte cuadrado
    centrado, JPG <=300KB."""
    if archivo.size > MAX_TAMANO_IMAGEN_BYTES:
        return None, Response(
            {'ok': False, 'error': 'La imagen no puede superar los 5 MB.'}, status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        return procesar_imagen_tarjeta(archivo), None
    except Exception:
        return None, Response(
            {'ok': False, 'error': 'El archivo no es una imagen válida.'}, status=status.HTTP_400_BAD_REQUEST,
        )


def _mensaje_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        mensajes = [m for lista in exc.message_dict.values() for m in lista]
    else:
        mensajes = list(exc.messages)
    return ' '.join(mensajes) if mensajes else 'Datos inválidos.'


def _parsear_calificacion(valor):
    """(calificacion, None) o (None, Response 400). `calificacion` es None
    si `valor` no vino o vino vacío (campo opcional) — el rango 1-5 lo
    valida Testimonio.clean(), acá solo se castea a int."""
    if valor is None or (isinstance(valor, str) and valor.strip() == ''):
        return None, None
    try:
        return int(valor), None
    except (TypeError, ValueError):
        return None, Response(
            {'ok': False, 'error': 'La calificación debe ser un número.'}, status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def testimonios_lista(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/testimonios/ — lista, ordenados por
    `orden`. POST — crea un testimonio nuevo al final del orden actual."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if request.method == 'GET':
        testimonios = tarjeta.testimonios.all()
        return Response(TestimonioSerializer(testimonios, many=True, context={'request': request}).data)

    # POST.
    if tarjeta.testimonios.count() >= MAX_TESTIMONIOS_POR_TARJETA:
        return Response(
            {'ok': False, 'error': f'Ya alcanzaste el máximo de {MAX_TESTIMONIOS_POR_TARJETA} testimonios.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    autor = (request.data.get('autor') or '').strip()
    texto = (request.data.get('texto') or '').strip()
    if not autor or not texto:
        return Response(
            {'ok': False, 'error': 'El autor y el testimonio son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST,
        )

    calificacion, error = _parsear_calificacion(request.data.get('calificacion'))
    if error is not None:
        return error

    archivo_imagen = request.FILES.get('imagen')
    contenido_jpg = None
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_testimonio(archivo_imagen)
        if error is not None:
            return error

    orden_maximo = tarjeta.testimonios.aggregate(maximo=Max('orden'))['maximo']
    try:
        testimonio = Testimonio.objects.create(
            tarjeta=tarjeta,
            autor=autor,
            relacion=request.data.get('relacion') or None,
            texto=texto,
            calificacion=calificacion,
            orden=(orden_maximo or 0) + 1,
        )
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    if contenido_jpg is not None:
        testimonio.avatar.save(f'testimonio_{testimonio.id}.jpg', ContentFile(contenido_jpg), save=True)

    return Response(
        TestimonioSerializer(testimonio, context={'request': request}).data, status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([AllowAny])
def testimonio_detalle(request, testimonio_id):
    """PATCH /api/testimonios/<id>/ — edita autor/relacion/texto/calificacion
    y/o reemplaza la imagen (multipart). DELETE — borra el testimonio y su
    archivo de imagen físico, si tenía."""
    testimonio, error = _obtener_testimonio_o_404(request, testimonio_id)
    if error is not None:
        return error

    if request.method == 'DELETE':
        if testimonio.avatar:
            testimonio.avatar.delete(save=False)
        testimonio.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH.
    archivo_imagen = request.FILES.get('imagen')
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_testimonio(archivo_imagen)
        if error is not None:
            return error
        if testimonio.avatar:
            testimonio.avatar.delete(save=False)
        testimonio.avatar.save(f'testimonio_{testimonio.id}.jpg', ContentFile(contenido_jpg), save=False)

    if 'autor' in request.data and not (request.data.get('autor') or '').strip():
        return Response({'ok': False, 'error': 'El autor es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
    if 'texto' in request.data and not (request.data.get('texto') or '').strip():
        return Response({'ok': False, 'error': 'El testimonio es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    for campo in ('autor', 'relacion', 'texto', 'calificacion'):
        if campo not in request.data:
            continue
        valor = request.data[campo]
        if isinstance(valor, str) and valor.strip() == '':
            valor = None
        if campo == 'calificacion' and valor is not None:
            try:
                valor = int(valor)
            except (TypeError, ValueError):
                return Response(
                    {'ok': False, 'error': 'La calificación debe ser un número.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        setattr(testimonio, campo, valor)

    try:
        testimonio.save()
    except DjangoValidationError as e:
        return Response({'ok': False, 'error': _mensaje_validation_error(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(TestimonioSerializer(testimonio, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def testimonios_reordenar(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/testimonios/reordenar/ —
    body `{"orden": [id1, id2, ...]}`. La posición en la lista define el
    nuevo `orden` de cada testimonio. Todo o nada: si la lista no coincide
    exactamente con los testimonios de esta tarjeta, no se toca ninguno."""
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

    testimonios_por_id = {t.id: t for t in tarjeta.testimonios.all()}
    if set(ids) != set(testimonios_por_id.keys()):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe incluir exactamente los testimonios de esta tarjeta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for posicion, testimonio_id in enumerate(ids):
        testimonios_por_id[testimonio_id].orden = posicion
    Testimonio.objects.bulk_update(testimonios_por_id.values(), ['orden'])

    testimonios = tarjeta.testimonios.all()
    return Response(TestimonioSerializer(testimonios, many=True, context={'request': request}).data)
