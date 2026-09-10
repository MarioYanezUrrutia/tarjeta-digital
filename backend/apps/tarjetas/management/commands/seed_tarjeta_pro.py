from django.core.management.base import BaseCommand
from apps.tarjetas.models import (
    Cliente, Tarjeta, Producto, Noticia, Testimonio, PreguntaFrecuente,
)


class Command(BaseCommand):
    help = 'Siembra una tarjeta Pro de prueba (idempotente) para desarrollo.'

    def handle(self, *args, **options):
        cliente, _ = Cliente.objects.get_or_create(
            email='pro-demo@kabymur.cl',
            defaults={'origen': 'kabymur', 'nombre': 'Demo Pro'},
        )

        tarjeta, _ = Tarjeta.objects.get_or_create(
            slug='demo-pro',
            defaults={
                'cliente': cliente,
                'tipo': 'negocio',
                'plan': 'kabymur_pro',
                'estado': 'borrador',
                'nombre_mostrado': 'Estudio Aura',
                'cargo_rubro': 'Estudio de Pilates y bienestar',
                'eslogan': 'Movimiento consciente para tu cuerpo',
                'sobre_texto': 'Somos un estudio boutique dedicado al Pilates '
                               'reformer y el bienestar integral. Clases '
                               'personalizadas en grupos reducidos.',
                'whatsapp': '56912345678',
                'email_contacto': 'hola@estudioaura.cl',
                'instagram': 'estudioaura',
                'direccion': 'Av. Providencia 1234, Santiago',
                'horario': 'Lun a Vie 7:00-21:00 / Sab 9:00-14:00',
            },
        )
        # Forzar plan Pro por si la tarjeta ya existía como básica
        if tarjeta.plan != 'kabymur_pro':
            tarjeta.plan = 'kabymur_pro'
            tarjeta.save()

        if not tarjeta.productos.exists():
            for i, (nom, car) in enumerate([
                ('Plan Mensual 8 clases', '2 clases por semana / grupos de 4'),
                ('Plan Full', 'Clases ilimitadas al mes'),
                ('Clase individual', 'Sesión 1 a 1 con instructor'),
            ]):
                Producto.objects.create(tarjeta=tarjeta, nombre=nom,
                                        caracteristicas=car, orden=i)

        if not tarjeta.noticias.exists():
            for i, t in enumerate([
                'Nuevos horarios de verano',
                'Taller de respiración este sábado',
                'Sumamos reformers nuevos',
            ]):
                Noticia.objects.create(tarjeta=tarjeta, titulo=t,
                                       resumen='Detalle de la novedad.', orden=i)

        if not tarjeta.testimonios.exists():
            for i, (a, tx) in enumerate([
                ('Carolina P.', 'Cambió mi postura en dos meses.'),
                ('Rodrigo M.', 'Los mejores instructores, muy dedicados.'),
            ]):
                Testimonio.objects.create(tarjeta=tarjeta, autor=a, texto=tx,
                                          calificacion=5, orden=i)

        if not tarjeta.faqs.exists():
            for i, (p, r) in enumerate([
                ('¿Necesito experiencia previa?', 'No, tenemos clases para todos los niveles.'),
                ('¿Debo reservar?', 'Sí, las reservas se hacen por WhatsApp.'),
            ]):
                PreguntaFrecuente.objects.create(tarjeta=tarjeta, pregunta=p,
                                                 respuesta=r, orden=i)

        self.stdout.write(self.style.SUCCESS(
            f'Tarjeta Pro lista: slug=demo-pro (plan={tarjeta.plan})'))
