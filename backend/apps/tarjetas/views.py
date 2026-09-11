from django.conf import settings
from django.http import JsonResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Tarjeta
from .serializers import TarjetaPublicaSerializer


def health(request):
    return JsonResponse({'status': 'ok'})


class TarjetaPublicaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            tarjeta = Tarjeta.objects.get(slug=slug)
        except Tarjeta.DoesNotExist:
            return Response(
                {'error': 'Tarjeta no encontrada'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Cobro-1: la tarjeta solo se muestra si su suscripción está vigente
        # (estado 'activa' con vencimiento futuro) — una en 'borrador'
        # (nunca pagada), 'vencida' o 'cortada' recibe el mismo trato: 200
        # con `disponible: false`, no un 404, para que el frontend muestre
        # un mensaje amable en vez de una página de error. TARJETA_MODO_DEV
        # (ver settings) salta este chequeo mientras no exista el cobro
        # real (Cobro-2) — si no, ninguna tarjeta (todas nacen en borrador)
        # se podría ver en desarrollo.
        if not settings.TARJETA_MODO_DEV and not tarjeta.esta_vigente():
            return Response({'disponible': False})

        serializer = TarjetaPublicaSerializer(tarjeta, context={'request': request})
        return Response({'disponible': True, **serializer.data})


class ContactoPublicoView(APIView):
    """POST /api/t/<slug>/contacto/ — formulario de contacto de la landing
    Pro. Público (sin sesión) pero limitado a 5/hora por IP vía
    ScopedRateThrottle (scope 'contacto_publico', ver settings.py) — sin
    esto, cualquiera podría spamear el email_contacto del dueño de la
    tarjeta. `website` es un honeypot: un campo oculto en el formulario que
    un humano nunca completa; si viene con algo, es un bot y se responde
    200 fingido sin mandar nada."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contacto_publico'

    def post(self, request, slug):
        try:
            tarjeta = Tarjeta.objects.get(slug=slug)
        except Tarjeta.DoesNotExist:
            return Response({'ok': False, 'error': 'Tarjeta no encontrada'}, status=404)

        if (request.data.get('website') or '').strip():
            return Response({'ok': True})

        nombre = (request.data.get('nombre') or '').strip()
        email = (request.data.get('email') or '').strip()
        mensaje = (request.data.get('mensaje') or '').strip()

        if not nombre or not mensaje:
            return Response({'ok': False, 'error': 'Faltan el nombre o el mensaje.'}, status=400)
        if len(nombre) > 120 or len(email) > 200 or len(mensaje) > 3000:
            return Response({'ok': False, 'error': 'Alguno de los campos es demasiado largo.'}, status=400)

        from .correos import correo_mensaje_contacto
        enviado = correo_mensaje_contacto(tarjeta, nombre, email, mensaje)
        if not enviado:
            return Response(
                {'ok': False, 'error': 'Esta tarjeta no tiene un correo de contacto configurado.'},
                status=400,
            )
        return Response({'ok': True})
