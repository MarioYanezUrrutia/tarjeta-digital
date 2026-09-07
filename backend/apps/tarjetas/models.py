from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
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

    # Valores válidos para la piel visual de la página pública (Fase A.3).
    # 'default' se mantiene como alias histórico de 'C' para no romper
    # tarjetas creadas antes de que este campo tuviera choices.
    PLANTILLA_CHOICES = [
        ('A', 'A — Elegante'),
        ('B', 'B — Moderna'),
        ('C', 'C — Link en bio'),
        ('default', 'default (alias de C)'),
    ]

    cliente = models.ForeignKey('Cliente', on_delete=models.CASCADE, related_name='tarjetas')
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES)
    plan = models.CharField(max_length=32, choices=PLAN_CHOICES)
    slug = models.SlugField(max_length=255, unique=True)
    plantilla = models.CharField(max_length=32, choices=PLANTILLA_CHOICES, default='C')
    estado = models.CharField(max_length=32, choices=ESTADO_CHOICES, default='borrador')
    creado = models.DateTimeField(auto_now_add=True)

    # Bloque Suscripción (Cobro-1) — el cobro real (Cobro-2) es quien setea
    # estos dos campos; acá solo se agrega el modelo + los helpers que lo
    # leen. `fecha_vencimiento` null == nunca se ha pagado (tarjeta en
    # 'borrador' toda su vida hasta el primer pago).
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)
    fecha_ultimo_pago = models.DateTimeField(null=True, blank=True)
    # Cobro-3a: cuándo se mandó el último correo_aviso_vencimiento — evita
    # reenviar el mismo aviso más de una vez por día si el management
    # command `revisar_vencimientos` corre varias veces (cron cada hora,
    # reintentos, etc.). No es un log completo, solo la última vez.
    fecha_ultimo_aviso = models.DateTimeField(null=True, blank=True)

    # Bloque Identidad
    imagen = models.ImageField(upload_to='tarjetas/', blank=True, null=True)
    nombre_mostrado = models.CharField(max_length=255, blank=True, null=True)
    cargo_rubro = models.CharField(max_length=255, blank=True, null=True)
    profesion = models.CharField(max_length=120, null=True, blank=True)
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

    def esta_vigente(self):
        """True si la suscripción está al día: estado 'activa' Y con
        vencimiento futuro. Es lo que decide si la página pública se
        muestra (ver TarjetaPublicaView) — no confundir con el propio
        campo `estado`, que el cobro/corte todavía no actualizan solos en
        esta fase (Cobro-1 es solo el modelo; Cobro-2 hace el cobro real y
        quien de verdad mueve `estado` a 'vencida'/'cortada')."""
        if self.estado != 'activa' or not self.fecha_vencimiento:
            return False
        return self.fecha_vencimiento > timezone.now()

    def dias_para_vencer(self):
        """Días que faltan para el vencimiento (negativo si ya venció), o
        None si la tarjeta no tiene `fecha_vencimiento` (nunca se pagó).
        Lo usarán el aviso previo (Cobro-3) y el corte (Cobro-2)."""
        if not self.fecha_vencimiento:
            return None
        return (self.fecha_vencimiento - timezone.now()).days

    def __str__(self):
        return f"{self.nombre_mostrado or self.slug} ({self.cliente})"


class ConfiguracionTarjetas(models.Model):
    """Configuración global del negocio de tarjetas — precio de la
    suscripción, duración y días de aviso previo. Antes vivían como
    constantes de solo lectura en `settings.py`/`.env`
    (`TARJETA_PRECIO_TERRAS` y compañía); ahora el admin las edita en
    caliente, sin tocar `.env` ni reiniciar el servidor.

    Singleton simple: siempre existe una única fila con `pk=1`.
    `save()` fuerza esa pk (así que no importa cómo se cree la instancia,
    nunca hay una segunda fila) y `delete()` no hace nada (la configuración
    del negocio no debería poder quedar sin existir). `obtener()` es el
    único punto de lectura que debe usar el resto del código — crea la fila
    la primera vez, sembrada con los valores que ya hubiera en `settings`
    (el `.env`) para no resetear silenciosamente un despliegue existente.
    """
    precio_terras = models.PositiveIntegerField(default=5)
    dias_suscripcion = models.PositiveIntegerField(default=30)
    dias_aviso_previo = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name = 'Configuración'
        verbose_name_plural = 'Configuración'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def obtener(cls):
        from django.conf import settings
        defaults = {
            'precio_terras': getattr(settings, 'TARJETA_PRECIO_TERRAS', 5),
            'dias_suscripcion': getattr(settings, 'TARJETA_DIAS_SUSCRIPCION', 30),
            'dias_aviso_previo': getattr(settings, 'TARJETA_DIAS_AVISO_PREVIO', 5),
        }
        config, _creada = cls.objects.get_or_create(pk=1, defaults=defaults)
        return config

    def __str__(self):
        return 'Configuración de tarjetas'


class PagoTarjeta(models.Model):
    """Registro de cada pago exitoso de una tarjeta (Cobro-2), creado desde
    `pago_views.pagar_tarjeta` solo cuando Banexa confirma el cobro. Antes
    de esto, lo único que quedaba de un pago era `Tarjeta.fecha_ultimo_pago`
    (se pisa en cada pago, no permite reconstruir historial ni sumar por
    período) — este modelo es la fuente de verdad para las estadísticas de
    ingresos del admin."""
    tarjeta = models.ForeignKey('Tarjeta', on_delete=models.CASCADE, related_name='pagos')
    monto_terras = models.PositiveIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f"{self.monto_terras} Terras — {self.tarjeta} ({self.fecha:%d-%m-%Y})"


class Estadisticas(Tarjeta):
    """Proxy sin tabla propia — existe solo para aparecer como una entrada
    de menú clickeable ("Estadísticas") en el índice del admin, cuya
    `changelist_view` (ver admin.py) se reemplaza por una página de
    reportes en vez de la lista de tarjetas de la que hereda."""

    class Meta:
        proxy = True
        verbose_name = 'Estadísticas'
        verbose_name_plural = 'Estadísticas'


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
