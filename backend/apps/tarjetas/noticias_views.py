# apps/tarjetas/noticias_views.py
"""Endpoints de gestión del listado de noticias de una tarjeta (Panel-3,
bloque Noticias) — calcado de productos_views.py.

Mismo patrón de autenticación que panel_views.py: el usuario se identifica
por su sesión de Banexa (`resolver_perfil_banexa`), sin usuario local de
Django; una noticia es "del usuario" si la tarjeta a la que pertenece lo es.
Una noticia de otra persona (o de una tarjeta que no existe) siempre da 404,
sin distinguir los dos casos — mismo criterio que el resto del panel.
"""
from django.core.files.base import ContentFile
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .imagenes import MAX_TAMANO_IMAGEN_BYTES, procesar_imagen_tarjeta
from .models import Cliente, Noticia
from .panel_views import _obtener_tarjeta_del_cliente
from .serializers import NoticiaSerializer

# Coincide con el límite que ya impone Noticia.clean() en models.py — queda
# acá como constante única para responder 400 antes de llegar al
# ValidationError del modelo, mismo patrón que MAX_PRODUCTOS_POR_TARJETA.
MAX_NOTICIAS_POR_TARJETA = 6


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


def _obtener_noticia_o_404(request, noticia_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    noticia = (
        Noticia.objects.filter(pk=noticia_id, tarjeta__cliente=cliente).first() if cliente else None
    )
    if noticia is None:
        return None, Response({'ok': False, 'error': 'Noticia no encontrada'}, status=status.HTTP_404_NOT_FOUND)
    return noticia, None


def _procesar_imagen_noticia(archivo):
    """(contenido_jpg, None) o (None, Response 400) — mismas reglas que la
    imagen de producto (Panel-3): <=5MB de entrada, recorte cuadrado
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


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def noticias_lista(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/noticias/ — lista, ordenadas por
    `orden`. POST — crea una noticia nueva al final del orden actual."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if request.method == 'GET':
        noticias = tarjeta.noticias.all()
        return Response(NoticiaSerializer(noticias, many=True, context={'request': request}).data)

    # POST.
    if tarjeta.noticias.count() >= MAX_NOTICIAS_POR_TARJETA:
        return Response(
            {'ok': False, 'error': f'Ya alcanzaste el máximo de {MAX_NOTICIAS_POR_TARJETA} noticias.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    titulo = (request.data.get('titulo') or '').strip()
    if not titulo:
        return Response({'ok': False, 'error': 'El título es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    archivo_imagen = request.FILES.get('imagen')
    contenido_jpg = None
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_noticia(archivo_imagen)
        if error is not None:
            return error

    orden_maximo = tarjeta.noticias.aggregate(maximo=Max('orden'))['maximo']
    noticia = Noticia.objects.create(
        tarjeta=tarjeta,
        titulo=titulo,
        resumen=request.data.get('resumen') or None,
        fecha=request.data.get('fecha') or None,
        enlace=request.data.get('enlace') or None,
        orden=(orden_maximo or 0) + 1,
    )
    if contenido_jpg is not None:
        noticia.imagen.save(f'noticia_{noticia.id}.jpg', ContentFile(contenido_jpg), save=True)

    return Response(
        NoticiaSerializer(noticia, context={'request': request}).data, status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([AllowAny])
def noticia_detalle(request, noticia_id):
    """PATCH /api/noticias/<id>/ — edita titulo/resumen/fecha/enlace y/o
    reemplaza la imagen (multipart). DELETE — borra la noticia y su archivo
    de imagen físico, si tenía."""
    noticia, error = _obtener_noticia_o_404(request, noticia_id)
    if error is not None:
        return error

    if request.method == 'DELETE':
        if noticia.imagen:
            noticia.imagen.delete(save=False)
        noticia.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH.
    archivo_imagen = request.FILES.get('imagen')
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_noticia(archivo_imagen)
        if error is not None:
            return error
        if noticia.imagen:
            noticia.imagen.delete(save=False)
        noticia.imagen.save(f'noticia_{noticia.id}.jpg', ContentFile(contenido_jpg), save=False)

    if 'titulo' in request.data and not (request.data.get('titulo') or '').strip():
        return Response({'ok': False, 'error': 'El título es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    for campo in ('titulo', 'resumen', 'fecha', 'enlace'):
        if campo in request.data:
            valor = request.data[campo]
            if isinstance(valor, str) and valor.strip() == '':
                valor = None
            setattr(noticia, campo, valor)

    noticia.save()
    return Response(NoticiaSerializer(noticia, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def noticias_reordenar(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/noticias/reordenar/ —
    body `{"orden": [id1, id2, ...]}`. La posición en la lista define el
    nuevo `orden` de cada noticia. Todo o nada: si la lista no coincide
    exactamente con las noticias de esta tarjeta, no se toca ninguna."""
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

    noticias_por_id = {n.id: n for n in tarjeta.noticias.all()}
    if set(ids) != set(noticias_por_id.keys()):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe incluir exactamente las noticias de esta tarjeta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for posicion, noticia_id in enumerate(ids):
        noticias_por_id[noticia_id].orden = posicion
    Noticia.objects.bulk_update(noticias_por_id.values(), ['orden'])

    noticias = tarjeta.noticias.all()
    return Response(NoticiaSerializer(noticias, many=True, context={'request': request}).data)
