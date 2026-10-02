from django.db import migrations

PRECIO_BASE_PRO_CLP = 5000


def fijar_precio_base(apps, schema_editor):
    """Deja el precio base mensual del plan Pro en $5.000. Si la fila
    singleton de configuración aún no existe, la crea (pk=1) con los demás
    campos en sus valores por defecto."""
    Config = apps.get_model('tarjetas', 'ConfiguracionTarjetas')
    config, _creada = Config.objects.get_or_create(pk=1)
    config.precio_pro_clp = PRECIO_BASE_PRO_CLP
    config.save()


class Migration(migrations.Migration):

    dependencies = [
        ('tarjetas', '0011_pro_planes_fundador_ordenes'),
    ]

    operations = [
        # Sin reversa: el valor anterior no se conoce.
        migrations.RunPython(fijar_precio_base, migrations.RunPython.noop),
    ]
