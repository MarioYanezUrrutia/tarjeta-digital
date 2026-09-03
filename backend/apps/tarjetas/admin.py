from django.contrib import admin
from .models import Cliente, Tarjeta, Producto


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'origen', 'email', 'creado')
    search_fields = ('nombre', 'email')


@admin.register(Tarjeta)
class TarjetaAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'cliente', 'plan', 'estado', 'creado')
    list_filter = ('plan', 'estado')
    search_fields = ('slug', 'nombre_mostrado', 'empresa')


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'tarjeta', 'precio', 'creado')
    search_fields = ('nombre',)
