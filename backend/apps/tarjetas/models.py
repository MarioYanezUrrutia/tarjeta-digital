from django.db import models
from django.core.exceptions import ValidationError
from django.utils.text import slugify


class Cliente(models.Model):
    ORIGEN_CHOICES = [
        ('kabymur', 'Kabymur'),
        ('gyg', 'GYG'),
    ]

    origen = models.CharField(max_length=32, choices=ORIGEN_CHOICES)
    banexa_user_id = models.CharField(max_length=255, blank=True, null=True)
    nombre = models.CharField(max_length=255)
    email = models.EmailField()
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.origen})"


class Tarjeta(models.Model):
    TIPO_CHOICES = [
        ('persona', 'Persona'),
        ('negocio', 'Negocio'),
    ]

    PLAN_CHOICES = [
        ('kabymur_basico', 'Kabymur Básico'),
        ('kabymur_pro', 'Kabymur Pro'),
        ('gyg_landing', 'GYG Landing'),
    ]

    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('activa', 'Activa'),
        ('vencida', 'Vencida'),
        ('cortada', 'Cortada'),
    ]

    cliente = models.ForeignKey('Cliente', on_delete=models.CASCADE, related_name='tarjetas')
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES)
    plan = models.CharField(max_length=32, choices=PLAN_CHOICES)
    slug = models.SlugField(max_length=255, unique=True)
    plantilla = models.CharField(max_length=128, default='default')
    estado = models.CharField(max_length=32, choices=ESTADO_CHOICES, default='borrador')
    creado = models.DateTimeField(auto_now_add=True)

    # Bloque Identidad
    imagen = models.ImageField(upload_to='tarjetas/', blank=True, null=True)
    nombre_mostrado = models.CharField(max_length=255, blank=True, null=True)
    cargo_rubro = models.CharField(max_length=255, blank=True, null=True)
    empresa = models.CharField(max_length=255, blank=True, null=True)
    eslogan = models.CharField(max_length=255, blank=True, null=True)

    # Bloque Contacto
    telefono = models.CharField(max_length=64, blank=True, null=True)
    whatsapp = models.CharField(max_length=64, blank=True, null=True)
    email_contacto = models.CharField(max_length=255, blank=True, null=True)
    sitio_web = models.CharField(max_length=255, blank=True, null=True)

    # Bloque Redes
    instagram = models.CharField(max_length=255, blank=True, null=True)
    facebook = models.CharField(max_length=255, blank=True, null=True)
    linkedin = models.CharField(max_length=255, blank=True, null=True)
    tiktok = models.CharField(max_length=255, blank=True, null=True)
    youtube = models.CharField(max_length=255, blank=True, null=True)
    x_twitter = models.CharField(max_length=255, blank=True, null=True)

    # Bloque Sobre
    sobre_texto = models.TextField(blank=True, null=True)

    # Bloque Ubicación
    direccion = models.CharField(max_length=255, blank=True, null=True)
    horario = models.CharField(max_length=255, blank=True, null=True)

    # Control de visibilidad
    mostrar_contacto = models.BooleanField(default=True)
    mostrar_redes = models.BooleanField(default=True)
    mostrar_sobre = models.BooleanField(default=True)
    mostrar_ubicacion = models.BooleanField(default=True)
    mostrar_productos = models.BooleanField(default=True)

    def clean(self):
        # Límite de 3 tarjetas por cliente
        if self.cliente_id:
            qs = Tarjeta.objects.filter(cliente_id=self.cliente_id)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.count() >= 3:
                raise ValidationError('Cada cliente puede tener como máximo 3 tarjetas.')

    def save(self, *args, **kwargs):
        # Generar slug si no existe
        if not self.slug:
            base = self.nombre_mostrado or f"tarjeta-{self.cliente_id}"
            candidate = slugify(base)[:200]
            # Asegurar unicidad simple
            suffix = 0
            slug = candidate
            while Tarjeta.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                suffix += 1
                slug = f"{candidate}-{suffix}"
            self.slug = slug
        # Validar límite antes de guardar
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre_mostrado or self.slug} ({self.cliente})"


class Producto(models.Model):
    tarjeta = models.ForeignKey('Tarjeta', on_delete=models.CASCADE, related_name='productos')
    imagen = models.ImageField(upload_to='productos/', null=True, blank=True)
    nombre = models.CharField(max_length=255)
    caracteristicas = models.TextField(null=True, blank=True)
    detalle = models.TextField(null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden']

    def __str__(self):
        return self.nombre
