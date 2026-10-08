# apps/tarjetas/productos_views.py
"""Endpoints de gestión del catálogo de productos de una tarjeta (Panel-3).

Mismo patrón de autenticación que panel_views.py: el usuario se identifica
por su sesión de Banexa (`resolver_perfil_banexa`), sin usuario local de
Django; un producto es "del usuario" si la tarjeta a la que pertenece lo es.
Un producto de otra persona (o de una tarjeta que no existe) siempre da 404,
sin distinguir los dos casos — mismo criterio que el resto del panel.
"""
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.cuentas.auth import resolver_perfil_banexa

from .imagenes import MAX_TAMANO_IMAGEN_BYTES, procesar_imagen_tarjeta
from .models import PRECIO_MAXIMO_CLP, Cliente, Producto, validar_anio_producto
from .panel_views import _obtener_tarjeta_del_cliente
from .serializers import ProductoSerializer

# Límite de productos por tarjeta según el plan: básica vs. Pro.
MAX_PRODUCTOS_BASICO = 10
MAX_PRODUCTOS_PRO = 20


def _max_productos(tarjeta):
    return MAX_PRODUCTOS_PRO if tarjeta.es_pro() else MAX_PRODUCTOS_BASICO


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


def _obtener_producto_o_404(request, producto_id):
    cliente, error = _cliente_autenticado(request)
    if error is not None:
        return None, error
    producto = (
        Producto.objects.filter(pk=producto_id, tarjeta__cliente=cliente).first() if cliente else None
    )
    if producto is None:
        return None, Response({'ok': False, 'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    return producto, None


def _entero_o_none(valor, etiqueta):
    """(entero | None, error). Vacío/None = sin dato. Acepta int o string de dígitos
    (un multipart manda todo como string); rechaza decimales, texto y booleanos."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None, None
    if isinstance(valor, bool):
        return None, f'{etiqueta} debe ser un número entero.'
    if isinstance(valor, int):
        return valor, None
    if isinstance(valor, str):
        texto = valor.strip()
        if texto.lstrip('-').isdigit():
            return int(texto), None
    return None, f'{etiqueta} debe ser un número entero.'


def _leer_precio_y_anio(data):
    """Valida precio_clp / precio_desde / anio del body (solo los que vengan).
    Devuelve ({campo: valor}, None) o (None, mensaje_de_error_en_español)."""
    campos = {}
    if 'precio_clp' in data:
        precio, error = _entero_o_none(data['precio_clp'], 'El precio')
        if error:
            return None, error
        if precio is not None and precio < 1:
            return None, 'El precio debe ser mayor a 0.'
        if precio is not None and precio > PRECIO_MAXIMO_CLP:
            return None, 'El precio no puede superar $99.999.999.'
        campos['precio_clp'] = precio
    if 'precio_desde' in data:
        valor = data['precio_desde']
        if isinstance(valor, str):
            valor = valor.strip().lower() in ('true', '1', 't')
        campos['precio_desde'] = bool(valor)
    if 'anio' in data:
        anio, error = _entero_o_none(data['anio'], 'El año')
        if error:
            return None, error
        if anio is not None:
            try:
                validar_anio_producto(anio)
            except ValidationError as exc:
                return None, exc.messages[0]
        campos['anio'] = anio
    if campos.get('precio_clp') is None:
        # Sin precio no tiene sentido el "Desde".
        if 'precio_clp' in campos:
            campos['precio_desde'] = False
    return campos, None


def _procesar_imagen_producto(archivo):
    """(contenido_jpg, None) o (None, Response 400) — mismas reglas que la
    imagen de la tarjeta (Panel-2): <=5MB de entrada, recorte cuadrado
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
def productos_lista(request, tarjeta_id):
    """GET /api/tarjetas/<tarjeta_id>/productos/ — lista, ordenados por
    `orden`. POST — crea un producto nuevo al final del orden actual."""
    tarjeta, error = _obtener_tarjeta_o_404(request, tarjeta_id)
    if error is not None:
        return error

    if request.method == 'GET':
        productos = tarjeta.productos.all()
        return Response(ProductoSerializer(productos, many=True, context={'request': request}).data)

    # POST.
    max_productos = _max_productos(tarjeta)
    if tarjeta.productos.count() >= max_productos:
        return Response(
            {'ok': False, 'error': f'Ya alcanzaste el máximo de {max_productos} productos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    nombre = (request.data.get('nombre') or '').strip()
    if not nombre:
        return Response({'ok': False, 'error': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

    extras, mensaje = _leer_precio_y_anio(request.data)
    if mensaje:
        return Response({'ok': False, 'error': mensaje}, status=status.HTTP_400_BAD_REQUEST)

    archivo_imagen = request.FILES.get('imagen')
    contenido_jpg = None
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_producto(archivo_imagen)
        if error is not None:
            return error

    orden_maximo = tarjeta.productos.aggregate(maximo=Max('orden'))['maximo']
    producto = Producto.objects.create(
        tarjeta=tarjeta,
        nombre=nombre,
        caracteristicas=request.data.get('caracteristicas') or None,
        detalle=request.data.get('detalle') or None,
        orden=(orden_maximo or 0) + 1,
        **extras,
    )
    if contenido_jpg is not None:
        producto.imagen.save(f'producto_{producto.id}.jpg', ContentFile(contenido_jpg), save=True)

    return Response(
        ProductoSerializer(producto, context={'request': request}).data, status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([AllowAny])
def producto_detalle(request, producto_id):
    """PATCH /api/productos/<id>/ — edita nombre/caracteristicas/detalle/precio/año y/o
    reemplaza la imagen (multipart). DELETE — borra el producto y su archivo
    de imagen físico, si tenía."""
    producto, error = _obtener_producto_o_404(request, producto_id)
    if error is not None:
        return error

    if request.method == 'DELETE':
        if producto.imagen:
            producto.imagen.delete(save=False)
        producto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH.
    extras, mensaje = _leer_precio_y_anio(request.data)
    if mensaje:
        return Response({'ok': False, 'error': mensaje}, status=status.HTTP_400_BAD_REQUEST)

    archivo_imagen = request.FILES.get('imagen')
    if archivo_imagen is not None:
        contenido_jpg, error = _procesar_imagen_producto(archivo_imagen)
        if error is not None:
            return error
        if producto.imagen:
            producto.imagen.delete(save=False)
        producto.imagen.save(f'producto_{producto.id}.jpg', ContentFile(contenido_jpg), save=False)

    for campo in ('nombre', 'caracteristicas', 'detalle'):
        if campo in request.data:
            setattr(producto, campo, request.data[campo])
    for campo, valor in extras.items():
        setattr(producto, campo, valor)

    producto.save()
    return Response(ProductoSerializer(producto, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def productos_reordenar(request, tarjeta_id):
    """POST /api/tarjetas/<tarjeta_id>/productos/reordenar/ —
    body `{"orden": [id1, id2, ...]}`. La posición en la lista define el
    nuevo `orden` de cada producto. Todo o nada: si la lista no coincide
    exactamente con los productos de esta tarjeta, no se toca ninguno."""
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

    productos_por_id = {p.id: p for p in tarjeta.productos.all()}
    if set(ids) != set(productos_por_id.keys()):
        return Response(
            {'ok': False, 'error': 'La lista de orden debe incluir exactamente los productos de esta tarjeta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    for posicion, producto_id in enumerate(ids):
        productos_por_id[producto_id].orden = posicion
    Producto.objects.bulk_update(productos_por_id.values(), ['orden'])

    productos = tarjeta.productos.all()
    return Response(ProductoSerializer(productos, many=True, context={'request': request}).data)
