from django.db import migrations


def completar_referencia(apps, schema_editor):
    """Completa `tarjeta_ref` ("id=<id> slug=<slug>") en los pagos que ya existen."""
    PagoTarjeta = apps.get_model('tarjetas', 'PagoTarjeta')
    for pago in PagoTarjeta.objects.filter(tarjeta_ref='', tarjeta__isnull=False).select_related('tarjeta'):
        pago.tarjeta_ref = f'id={pago.tarjeta_id} slug={pago.tarjeta.slug}'
        pago.save(update_fields=['tarjeta_ref'])


class Migration(migrations.Migration):

    dependencies = [
        ('tarjetas', '0013_pagos_set_null_y_referencia'),
    ]

    operations = [
        migrations.RunPython(completar_referencia, migrations.RunPython.noop),
    ]
