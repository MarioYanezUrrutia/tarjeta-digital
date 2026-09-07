# apps/tarjetas/management/commands/revisar_vencimientos.py
"""python manage.py revisar_vencimientos — pensado para correr
periódicamente (cron/tarea programada, ej. una vez al día). Hace dos cosas,
ninguna irreversible ni de cobro:

1. Avisa por correo a las tarjetas 'activa' cuyo vencimiento está a
   `ConfiguracionTarjetas.obtener().dias_aviso_previo` días o menos
   (`correo_aviso_vencimiento`), sin reenviar el mismo aviso más de una vez
   por día (usa `fecha_ultimo_aviso`).
2. Corta (pasa a 'vencida') las tarjetas 'activa' cuyo vencimiento ya pasó,
   y les avisa por correo (`correo_tarjeta_cortada`). El efecto de "ya no se
   muestra públicamente" es automático vía `Tarjeta.esta_vigente()` — este
   comando solo actualiza el estado y avisa, no toca la vista pública.

Idempotente: correrlo varias veces seguidas (o el mismo día) no reenvía el
mismo aviso ni vuelve a "cortar"/avisar una tarjeta que ya quedó en
'vencida' — el filtro `estado='activa'` de la Parte 2 ya la excluye la
segunda vez.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.tarjetas.correos import correo_aviso_vencimiento, correo_tarjeta_cortada
from apps.tarjetas.models import ConfiguracionTarjetas, Tarjeta


class Command(BaseCommand):
    help = (
        'Avisa por correo las tarjetas activas por vencer y corta (pasa a '
        '"vencida") las que ya vencieron.'
    )

    def handle(self, *args, **options):
        ahora = timezone.now()
        hoy = timezone.localdate()

        # 1) Aviso previo: activas, con vencimiento futuro dentro de la
        # ventana de aviso, que no hayan recibido el aviso hoy todavía.
        dias_aviso_previo = ConfiguracionTarjetas.obtener().dias_aviso_previo
        limite_aviso = ahora + timedelta(days=dias_aviso_previo)
        candidatas_aviso = Tarjeta.objects.filter(
            estado='activa',
            fecha_vencimiento__gt=ahora,
            fecha_vencimiento__lte=limite_aviso,
        )
        avisadas = 0
        for tarjeta in candidatas_aviso:
            ya_avisada_hoy = (
                tarjeta.fecha_ultimo_aviso is not None
                and timezone.localtime(tarjeta.fecha_ultimo_aviso).date() == hoy
            )
            if ya_avisada_hoy:
                continue
            correo_aviso_vencimiento(tarjeta)
            tarjeta.fecha_ultimo_aviso = ahora
            tarjeta.save(update_fields=['fecha_ultimo_aviso'])
            avisadas += 1

        # 2) Corte: activas cuyo vencimiento ya pasó. `estado='activa'`
        # hace que correr esto de nuevo sobre la misma tarjeta no la toque
        # ni la avise una segunda vez (ya no matchea el filtro).
        candidatas_corte = Tarjeta.objects.filter(estado='activa', fecha_vencimiento__lte=ahora)
        cortadas = 0
        for tarjeta in candidatas_corte:
            tarjeta.estado = 'vencida'
            tarjeta.save(update_fields=['estado'])
            correo_tarjeta_cortada(tarjeta)
            cortadas += 1

        self.stdout.write(self.style.SUCCESS(
            f'Avisos de vencimiento enviados: {avisadas}. '
            f'Tarjetas cortadas (pasadas a "vencida"): {cortadas}.'
        ))
