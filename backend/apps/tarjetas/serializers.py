from rest_framework import serializers

from .models import Producto, Tarjeta


class ProductoPublicoSerializer(serializers.ModelSerializer):
    imagen = serializers.ImageField(use_url=True)

    class Meta:
        model = Producto
        fields = ['nombre', 'imagen', 'caracteristicas', 'detalle', 'orden']


class TarjetaPublicaSerializer(serializers.ModelSerializer):
    productos = serializers.SerializerMethodField()

    class Meta:
        model = Tarjeta
        fields = [
            # Identidad
            'imagen', 'nombre_mostrado', 'cargo_rubro', 'empresa', 'eslogan',
            'tipo', 'plantilla',
            # Contacto
            'telefono', 'whatsapp', 'email_contacto', 'sitio_web',
            # Redes
            'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x_twitter',
            # Sobre
            'sobre_texto',
            # Ubicación
            'direccion', 'horario',
            # Flags de visibilidad
            'mostrar_contacto', 'mostrar_redes', 'mostrar_sobre',
            'mostrar_ubicacion', 'mostrar_productos',
            # Productos
            'productos',
        ]

    def get_productos(self, obj):
        if not obj.mostrar_productos:
            return []
        productos = obj.productos.all()
        return ProductoPublicoSerializer(productos, many=True, context=self.context).data
