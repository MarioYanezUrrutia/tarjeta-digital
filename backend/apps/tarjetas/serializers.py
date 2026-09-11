from rest_framework import serializers

from .models import Noticia, PreguntaFrecuente, Producto, Tarjeta, Testimonio


class ProductoPublicoSerializer(serializers.ModelSerializer):
    imagen = serializers.ImageField(use_url=True)

    class Meta:
        model = Producto
        fields = ['nombre', 'imagen', 'caracteristicas', 'detalle', 'orden']


class NoticiaPublicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Noticia
        fields = ['imagen', 'titulo', 'resumen', 'fecha', 'enlace', 'orden']


class TestimonioPublicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonio
        fields = ['avatar', 'autor', 'relacion', 'texto', 'calificacion', 'orden']


class FaqPublicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreguntaFrecuente
        fields = ['pregunta', 'respuesta', 'orden']


class TarjetaPublicaSerializer(serializers.ModelSerializer):
    productos = serializers.SerializerMethodField()
    es_pro = serializers.SerializerMethodField()
    noticias = serializers.SerializerMethodField()
    testimonios = serializers.SerializerMethodField()
    faqs = serializers.SerializerMethodField()

    class Meta:
        model = Tarjeta
        fields = [
            # Identidad
            'imagen', 'nombre_mostrado', 'cargo_rubro', 'profesion', 'empresa', 'eslogan',
            'tipo', 'plantilla', 'plan', 'es_pro',
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
            'mostrar_noticias', 'mostrar_testimonios', 'mostrar_faq',
            # Productos
            'productos',
            # Noticias / Testimonios / FAQ (Pro)
            'noticias', 'testimonios', 'faqs',
        ]

    def get_productos(self, obj):
        if not obj.mostrar_productos:
            return []
        productos = obj.productos.all()
        return ProductoPublicoSerializer(productos, many=True, context=self.context).data

    def get_es_pro(self, obj):
        return obj.es_pro()

    def get_noticias(self, obj):
        if not obj.mostrar_noticias:
            return []
        return NoticiaPublicaSerializer(obj.noticias.all(), many=True, context=self.context).data

    def get_testimonios(self, obj):
        if not obj.mostrar_testimonios:
            return []
        return TestimonioPublicoSerializer(obj.testimonios.all(), many=True, context=self.context).data

    def get_faqs(self, obj):
        if not obj.mostrar_faq:
            return []
        return FaqPublicaSerializer(obj.faqs.all(), many=True, context=self.context).data


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


class NoticiaSerializer(serializers.ModelSerializer):
    """Panel: gestión de noticias (GET/POST/PATCH/DELETE en
    noticias_views.py). `imagen` de solo lectura — se sube/reemplaza por
    request.FILES, igual que la imagen de producto (Panel-3); `orden`
    también de solo lectura acá — se fija solo (al crear) o vía POST
    .../noticias/reordenar/, nunca escribiendo este serializer directo."""

    class Meta:
        model = Noticia
        fields = ['id', 'imagen', 'titulo', 'resumen', 'fecha', 'enlace', 'orden']
        read_only_fields = ['id', 'imagen', 'orden']


class TestimonioSerializer(serializers.ModelSerializer):
    """Panel: gestión de testimonios (GET/POST/PATCH/DELETE en
    testimonios_views.py). `avatar` de solo lectura — se sube/reemplaza por
    request.FILES, igual que la imagen de noticia (Panel-3); `orden`
    también de solo lectura acá — se fija solo (al crear) o vía POST
    .../testimonios/reordenar/, nunca escribiendo este serializer directo."""

    class Meta:
        model = Testimonio
        fields = ['id', 'avatar', 'autor', 'relacion', 'texto', 'calificacion', 'orden']
        read_only_fields = ['id', 'avatar', 'orden']


class MisTarjetasSerializer(serializers.ModelSerializer):
    """GET /api/mis-tarjetas/ y respuesta de POST /api/tarjetas/ — lo mínimo
    para la pantalla de inicio del panel (lista de tarjetas + botón crear)."""

    class Meta:
        model = Tarjeta
        fields = ['id', 'slug', 'nombre_mostrado', 'plan', 'estado', 'plantilla', 'fecha_vencimiento']


class TarjetaPanelSerializer(serializers.ModelSerializer):
    """GET/PATCH /api/tarjetas/<id>/ — todos los campos que edita el
    formulario del panel, más `imagen` de solo lectura (se sube y procesa
    aparte, por request.FILES — ver panel_views.tarjeta_detalle — nunca por
    este serializer). NO incluye `productos` (Panel-3): fuera de alcance."""

    es_pro = serializers.SerializerMethodField()

    class Meta:
        model = Tarjeta
        fields = [
            'id', 'slug', 'plan', 'estado', 'tipo', 'plantilla', 'imagen',
            'fecha_vencimiento', 'fecha_ultimo_pago',
            'nombre_mostrado', 'cargo_rubro', 'profesion', 'empresa', 'eslogan',
            'telefono', 'whatsapp', 'email_contacto', 'sitio_web',
            'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x_twitter',
            'sobre_texto', 'direccion', 'horario',
            'mostrar_contacto', 'mostrar_redes', 'mostrar_sobre',
            'mostrar_ubicacion', 'mostrar_productos',
            'es_pro',
        ]
        read_only_fields = [
            'id', 'slug', 'plan', 'estado', 'imagen', 'fecha_vencimiento', 'fecha_ultimo_pago',
        ]

    def get_es_pro(self, obj):
        return obj.es_pro()
