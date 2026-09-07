from django.conf import settings
from django.http import JsonResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
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
