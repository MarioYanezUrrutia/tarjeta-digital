from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.tarjetas.panel_views import crear_tarjeta, mis_tarjetas, tarjeta_detalle
from apps.tarjetas.productos_views import producto_detalle, productos_lista, productos_reordenar
from apps.tarjetas.views import TarjetaPublicaView, health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/t/<slug:slug>/', TarjetaPublicaView.as_view(), name='tarjeta-publica'),
    path('api/auth/', include('apps.cuentas.urls')),
    path('api/mis-tarjetas/', mis_tarjetas, name='mis-tarjetas'),
    path('api/tarjetas/', crear_tarjeta, name='crear-tarjeta'),
    path('api/tarjetas/<int:tarjeta_id>/', tarjeta_detalle, name='tarjeta-detalle'),
    path('api/tarjetas/<int:tarjeta_id>/productos/reordenar/', productos_reordenar, name='productos-reordenar'),
    path('api/tarjetas/<int:tarjeta_id>/productos/', productos_lista, name='productos-lista'),
    path('api/productos/<int:producto_id>/', producto_detalle, name='producto-detalle'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
