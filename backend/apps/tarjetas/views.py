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

        # TODO: validar estado activo/no vencida cuando exista suscripción
        serializer = TarjetaPublicaSerializer(tarjeta, context={'request': request})
        return Response(serializer.data)
