from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from apps.tarjetas.views import TarjetaPublicaView, health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/t/<slug:slug>/', TarjetaPublicaView.as_view(), name='tarjeta-publica'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
