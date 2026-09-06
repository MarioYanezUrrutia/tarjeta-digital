# apps/tarjetas/imagenes.py
"""Procesamiento de la foto/logo de una tarjeta — recorte cuadrado centrado +
compresión a JPG, adaptado de `_procesar_foto_perfil` de Banexa (bot_ia,
apps/api/perfil_views.py) al tamaño más grande que usa la tarjeta pública.
"""
from io import BytesIO

MAX_TAMANO_IMAGEN_BYTES = 5 * 1024 * 1024  # 5 MB de entrada, antes de procesar
IMAGEN_LADO_MAXIMO_PX = 600                # cuadrado final, nunca se agranda una imagen más chica
IMAGEN_PESO_OBJETIVO_BYTES = 300 * 1024    # <=300KB de salida


def _recortar_al_centro(imagen):
    """Recorta `imagen` al cuadrado más grande posible centrado — el lado
    corto manda, se recortan los bordes sobrantes del lado largo."""
    ancho, alto = imagen.size
    lado = min(ancho, alto)
    izquierda = (ancho - lado) // 2
    arriba = (alto - lado) // 2
    return imagen.crop((izquierda, arriba, izquierda + lado, arriba + lado))


def procesar_imagen_tarjeta(archivo) -> bytes:
    """Recorte centrado a cuadrado -> máx IMAGEN_LADO_MAXIMO_PX (sin agrandar
    imágenes más chicas) -> aplanado sobre fondo blanco (por si venía con
    transparencia) -> JPG comprimido a <=IMAGEN_PESO_OBJETIVO_BYTES.

    Acepta cualquier formato que el Pillow instalado sepa decodificar (JPG/
    PNG/WEBP nativos). Levanta la excepción de Pillow tal cual si `archivo`
    no es una imagen válida o está corrupta — el llamador la traduce a un 400
    claro, nunca la revienta como error 500.

    Pillow se importa ACÁ DENTRO (lazy import), no a nivel de módulo: un
    import a nivel de módulo arrastra numpy en cada arranque del proceso
    aunque nunca se suba una imagen — el mismo problema que causó los 500 en
    Banexa (ver bot_ia/backend/reportes/FIX_LAZY_IMPORT.md).
    """
    from PIL import Image

    imagen = Image.open(archivo)
    imagen.load()  # fuerza la decodificación completa (detecta corrupción real, no solo el header)

    imagen = imagen.convert('RGBA')
    fondo = Image.new('RGB', imagen.size, (255, 255, 255))
    fondo.paste(imagen, mask=imagen.getchannel('A'))
    imagen = fondo

    imagen = _recortar_al_centro(imagen)
    if imagen.width > IMAGEN_LADO_MAXIMO_PX:
        imagen = imagen.resize((IMAGEN_LADO_MAXIMO_PX, IMAGEN_LADO_MAXIMO_PX), Image.LANCZOS)

    calidad = 85
    buffer = BytesIO()
    imagen.save(buffer, format='JPEG', quality=calidad)
    while buffer.tell() > IMAGEN_PESO_OBJETIVO_BYTES and calidad > 30:
        calidad -= 10
        buffer = BytesIO()
        imagen.save(buffer, format='JPEG', quality=calidad)

    return buffer.getvalue()
