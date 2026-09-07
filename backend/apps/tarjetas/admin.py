# apps/tarjetas/admin.py
"""Admin de Django como herramienta de gestión del negocio (uso interno,
staff/superusuarios) — Módulo de administración: tablas útiles para
Cliente/Tarjeta/Producto/PagoTarjeta, la Configuración del negocio editable
(precio, duración de suscripción, aviso previo — antes fija en `.env`) y una
página de Estadísticas.
"""
from datetime import timedelta

from django.contrib import admin
from django.db.models import Count, Sum
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.utils import timezone

from .models import Cliente, ConfiguracionTarjetas, Estadisticas, PagoTarjeta, Producto, Tarjeta


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'origen', 'banexa_user_id', 'creado', 'cantidad_tarjetas')
    list_filter = ('origen',)
    search_fields = ('nombre', 'email', 'banexa_user_id')
    ordering = ('-creado',)

    @admin.display(description='Tarjetas')
    def cantidad_tarjetas(self, obj):
        return obj.tarjetas.count()


class ProductoInline(admin.TabularInline):
    model = Producto
    extra = 0
    fields = ('nombre', 'orden', 'caracteristicas')


@admin.register(Tarjeta)
class TarjetaAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'nombre_mostrado', 'cliente', 'plan', 'estado_coloreado',
        'fecha_vencimiento', 'dias_para_vencer_admin', 'slug', 'creado',
    )
    list_filter = ('estado', 'plan', 'tipo')
    search_fields = ('nombre_mostrado', 'slug', 'cliente__email', 'cliente__nombre')
    ordering = ('-creado',)
    inlines = [ProductoInline]

    COLOR_ESTADO = {
        'activa': '#15803d',
        'borrador': '#6b7280',
        'vencida': '#b45309',
        'cortada': '#b91c1c',
    }

    @admin.display(description='Estado', ordering='estado')
    def estado_coloreado(self, obj):
        from django.utils.html import format_html
        color = self.COLOR_ESTADO.get(obj.estado, '#000')
        return format_html('<strong style="color: {}">{}</strong>', color, obj.get_estado_display())

    @admin.display(description='Días para vencer')
    def dias_para_vencer_admin(self, obj):
        dias = obj.dias_para_vencer()
        return dias if dias is not None else '—'


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'tarjeta', 'orden')
    search_fields = ('nombre', 'tarjeta__slug', 'tarjeta__nombre_mostrado')
    ordering = ('tarjeta', 'orden')


@admin.register(PagoTarjeta)
class PagoTarjetaAdmin(admin.ModelAdmin):
    list_display = ('id', 'tarjeta', 'monto_terras', 'fecha')
    list_filter = ('fecha',)
    search_fields = ('tarjeta__slug', 'tarjeta__nombre_mostrado', 'tarjeta__cliente__email')
    date_hierarchy = 'fecha'
    ordering = ('-fecha',)

    def has_add_permission(self, request):
        # Los pagos los crea pago_views.pagar_tarjeta cuando Banexa confirma
        # el cobro — no tiene sentido crear uno "a mano" desde el admin.
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ConfiguracionTarjetas)
class ConfiguracionTarjetasAdmin(admin.ModelAdmin):
    """Singleton: una sola fila (pk=1, ver `ConfiguracionTarjetas.save`).
    El changelist no tiene sentido para una sola fila — se salta directo al
    formulario de edición, así el admin se siente como una página de
    "Configuración" en vez de una tabla."""
    list_display = ('precio_terras', 'dias_suscripcion', 'dias_aviso_previo')

    def has_add_permission(self, request):
        return not ConfiguracionTarjetas.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        config = ConfiguracionTarjetas.obtener()
        return redirect('admin:tarjetas_configuraciontarjetas_change', config.pk)


def _desglose(queryset, campo, choices):
    """[{'valor', 'label', 'total'}] para cada opción de `choices`, con el
    conteo real del queryset — incluye las opciones en 0 (para que el
    reporte muestre "Borrador: 0" en vez de omitir la fila)."""
    conteos = dict(queryset.values_list(campo).annotate(total=Count('id')))
    return [
        {'valor': valor, 'label': label, 'total': conteos.get(valor, 0)}
        for valor, label in choices
    ]


@admin.register(Estadisticas)
class EstadisticasAdmin(admin.ModelAdmin):
    """Proxy de Tarjeta usado solo para tener una entrada de menú
    "Estadísticas" en el índice del admin — `changelist_view` reemplaza la
    lista normal por una página de reportes del negocio."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_module_permission(self, request):
        return request.user.is_staff

    def changelist_view(self, request, extra_context=None):
        ahora = timezone.now()

        estados = _desglose(Tarjeta.objects.all(), 'estado', Tarjeta.ESTADO_CHOICES)
        planes = _desglose(Tarjeta.objects.filter(estado='activa'), 'plan', Tarjeta.PLAN_CHOICES)

        inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        agregados_totales = PagoTarjeta.objects.aggregate(total=Sum('monto_terras'), cantidad=Count('id'))
        agregados_mes = PagoTarjeta.objects.filter(fecha__gte=inicio_mes).aggregate(total=Sum('monto_terras'))

        contexto = {
            **self.admin_site.each_context(request),
            'title': 'Estadísticas del negocio',
            'total_clientes': Cliente.objects.count(),
            'total_tarjetas': Tarjeta.objects.count(),
            'estados': estados,
            'planes': planes,
            'ingresos_totales': agregados_totales['total'] or 0,
            'total_pagos': agregados_totales['cantidad'] or 0,
            'ingresos_mes': agregados_mes['total'] or 0,
            'proximas_a_vencer': Tarjeta.objects.filter(
                estado='activa',
                fecha_vencimiento__gt=ahora,
                fecha_vencimiento__lte=ahora + timedelta(days=7),
            ).count(),
        }
        return TemplateResponse(request, 'admin/tarjetas/estadisticas.html', contexto)
