from django.conf import settings
from django.db import migrations


def crear_configuracion_inicial(apps, schema_editor):
    """Crea la única fila de configuración (pk=1), sembrada con lo que ya
    hubiera en settings/.env — así un despliegue existente no ve su precio
    resetearse silenciosamente al aplicar esta migración."""
    ConfiguracionTarjetas = apps.get_model('tarjetas', 'ConfiguracionTarjetas')
    ConfiguracionTarjetas.objects.get_or_create(
        pk=1,
        defaults={
            'precio_terras': getattr(settings, 'TARJETA_PRECIO_TERRAS', 5),
            'dias_suscripcion': getattr(settings, 'TARJETA_DIAS_SUSCRIPCION', 30),
            'dias_aviso_previo': getattr(settings, 'TARJETA_DIAS_AVISO_PREVIO', 5),
        },
    )


def eliminar_configuracion_inicial(apps, schema_editor):
    ConfiguracionTarjetas = apps.get_model('tarjetas', 'ConfiguracionTarjetas')
    ConfiguracionTarjetas.objects.filter(pk=1).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tarjetas', '0006_configuraciontarjetas_estadisticas_pagotarjeta'),
    ]

    operations = [
        migrations.RunPython(crear_configuracion_inicial, eliminar_configuracion_inicial),
    ]
