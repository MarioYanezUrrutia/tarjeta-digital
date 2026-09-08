from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.tarjetas.pago_views import estado_pago, pagar_tarjeta
from apps.tarjetas.panel_views import crear_tarjeta, mis_tarjetas, tarjeta_detalle
from apps.tarjetas.productos_views import producto_detalle, productos_lista, productos_reordenar
from apps.tarjetas.views import TarjetaPublicaView, health

prefix = settings.URL_PREFIX

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'{prefix}health/', health),
    path(f'{prefix}t/<slug:slug>/', TarjetaPublicaView.as_view(), name='tarjeta-publica'),
    path(f'{prefix}auth/', include('apps.cuentas.urls')),
    path(f'{prefix}mis-tarjetas/', mis_tarjetas, name='mis-tarjetas'),
    path(f'{prefix}tarjetas/', crear_tarjeta, name='crear-tarjeta'),
    path(f'{prefix}tarjetas/<int:tarjeta_id>/', tarjeta_detalle, name='tarjeta-detalle'),
    path(f'{prefix}tarjetas/<int:tarjeta_id>/productos/reordenar/', productos_reordenar, name='productos-reordenar'),
    path(f'{prefix}tarjetas/<int:tarjeta_id>/productos/', productos_lista, name='productos-lista'),
    path(f'{prefix}productos/<int:producto_id>/', producto_detalle, name='producto-detalle'),
    path(f'{prefix}tarjetas/<int:tarjeta_id>/estado-pago/', estado_pago, name='tarjeta-estado-pago'),
    path(f'{prefix}tarjetas/<int:tarjeta_id>/pagar/', pagar_tarjeta, name='tarjeta-pagar'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
