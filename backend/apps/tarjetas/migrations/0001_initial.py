from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Cliente',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('origen', models.CharField(choices=[('kabymur', 'Kabymur'), ('gyg', 'GYG')], max_length=32)),
                ('banexa_user_id', models.CharField(blank=True, max_length=255, null=True)),
                ('nombre', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('creado', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Tarjeta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('persona', 'Persona'), ('negocio', 'Negocio')], max_length=32)),
                ('plan', models.CharField(choices=[('kabymur_basico', 'Kabymur Básico'), ('kabymur_pro', 'Kabymur Pro'), ('gyg_landing', 'GYG Landing')], max_length=32)),
                ('slug', models.SlugField(unique=True, max_length=255)),
                ('plantilla', models.CharField(default='default', max_length=128)),
                ('estado', models.CharField(choices=[('borrador', 'Borrador'), ('activa', 'Activa'), ('vencida', 'Vencida'), ('cortada', 'Cortada')], default='borrador', max_length=32)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='tarjetas/')),
                ('nombre_mostrado', models.CharField(blank=True, max_length=255, null=True)),
                ('cargo_rubro', models.CharField(blank=True, max_length=255, null=True)),
                ('empresa', models.CharField(blank=True, max_length=255, null=True)),
                ('eslogan', models.CharField(blank=True, max_length=255, null=True)),
                ('telefono', models.CharField(blank=True, max_length=64, null=True)),
                ('whatsapp', models.CharField(blank=True, max_length=64, null=True)),
                ('email_contacto', models.CharField(blank=True, max_length=255, null=True)),
                ('sitio_web', models.CharField(blank=True, max_length=255, null=True)),
                ('instagram', models.CharField(blank=True, max_length=255, null=True)),
                ('facebook', models.CharField(blank=True, max_length=255, null=True)),
                ('linkedin', models.CharField(blank=True, max_length=255, null=True)),
                ('tiktok', models.CharField(blank=True, max_length=255, null=True)),
                ('youtube', models.CharField(blank=True, max_length=255, null=True)),
                ('x_twitter', models.CharField(blank=True, max_length=255, null=True)),
                ('sobre_texto', models.TextField(blank=True, null=True)),
                ('direccion', models.CharField(blank=True, max_length=255, null=True)),
                ('horario', models.CharField(blank=True, max_length=255, null=True)),
                ('mostrar_contacto', models.BooleanField(default=True)),
                ('mostrar_redes', models.BooleanField(default=True)),
                ('mostrar_sobre', models.BooleanField(default=True)),
                ('mostrar_ubicacion', models.BooleanField(default=True)),
                ('mostrar_productos', models.BooleanField(default=True)),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tarjetas', to='apps.tarjetas.cliente')),
            ],
        ),
        migrations.CreateModel(
            name='Producto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=255)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('precio', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='productos/')),
                ('url', models.CharField(blank=True, max_length=500, null=True)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('tarjeta', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='productos', to='apps.tarjetas.tarjeta')),
            ],
        ),
    ]
