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
            'imagen', 'nombre_mostrado', 'cargo_rubro', 'profesion', 'empresa', 'eslogan',
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


class ProductoSerializer(serializers.ModelSerializer):
    """Panel: gestión de productos (GET/POST/PATCH/DELETE en
    productos_views.py). `imagen` de solo lectura — se sube/reemplaza por
    request.FILES, igual que la imagen de la tarjeta (Panel-2); `orden`
    también de solo lectura acá — se fija solo (al crear) o vía POST
    .../productos/reordenar/, nunca escribiendo este serializer directo."""

    class Meta:
        model = Producto
        fields = ['id', 'imagen', 'nombre', 'caracteristicas', 'detalle', 'orden']
        read_only_fields = ['id', 'imagen', 'orden']


class MisTarjetasSerializer(serializers.ModelSerializer):
    """GET /api/mis-tarjetas/ y respuesta de POST /api/tarjetas/ — lo mínimo
    para la pantalla de inicio del panel (lista de tarjetas + botón crear)."""

    class Meta:
        model = Tarjeta
        fields = ['id', 'slug', 'nombre_mostrado', 'plan', 'estado', 'plantilla']


class TarjetaPanelSerializer(serializers.ModelSerializer):
    """GET/PATCH /api/tarjetas/<id>/ — todos los campos que edita el
    formulario del panel, más `imagen` de solo lectura (se sube y procesa
    aparte, por request.FILES — ver panel_views.tarjeta_detalle — nunca por
    este serializer). NO incluye `productos` (Panel-3): fuera de alcance."""

    class Meta:
        model = Tarjeta
        fields = [
            'id', 'slug', 'plan', 'estado', 'tipo', 'plantilla', 'imagen',
            'nombre_mostrado', 'cargo_rubro', 'profesion', 'empresa', 'eslogan',
            'telefono', 'whatsapp', 'email_contacto', 'sitio_web',
            'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x_twitter',
            'sobre_texto', 'direccion', 'horario',
            'mostrar_contacto', 'mostrar_redes', 'mostrar_sobre',
            'mostrar_ubicacion', 'mostrar_productos',
        ]
        read_only_fields = ['id', 'slug', 'plan', 'estado', 'imagen']
