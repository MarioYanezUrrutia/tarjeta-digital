# apps/tarjetas/planes.py
"""Planes de la landing Pro: precios, plan Fundador y suma de meses.

Todos los montos se calculan SIEMPRE en el servidor a partir de
`ConfiguracionTarjetas` (editable en el admin); el frontend solo los muestra.
Este módulo no toca la base de datos salvo para leer (cupos, pagos previos):
la asignación del número de fundador y la extensión de vigencia viven en
`pago_views._activar_pro_desde_orden`, dentro de su transacción.
"""
import calendar
from datetime import timedelta

from .models import ConfiguracionTarjetas, Tarjeta

PLAN_FUNDADOR = 'fundador'
PLAN_MENSUAL = 'mensual'
PLAN_SEMESTRAL = 'semestral'
PLAN_ANUAL = 'anual'

NOMBRES = {
    PLAN_FUNDADOR: 'Plan Fundador',
    PLAN_MENSUAL: 'Mensual',
    PLAN_SEMESTRAL: 'Semestral',
    PLAN_ANUAL: 'Anual',
}


def sumar_meses(fecha, meses):
    """Suma `meses` calendario a un datetime aware (el día se ajusta al último
    del mes si no existe, p. ej. 31-ene + 1 mes = 28/29-feb)."""
    total = fecha.month - 1 + meses
    anio = fecha.year + total // 12
    mes = total % 12 + 1
    dia = min(fecha.day, calendar.monthrange(anio, mes)[1])
    return fecha.replace(year=anio, month=mes, day=dia)


def cupos_fundador_restantes(config=None):
    """Cupos que quedan del plan Fundador (nunca negativo)."""
    config = config or ConfiguracionTarjetas.obtener()
    usados = Tarjeta.objects.filter(numero_fundador__isnull=False).count()
    return max(0, config.fundador_cupos - usados)


def es_primera_compra(tarjeta):
    """Landing que nunca ha pagado ni fue fundadora."""
    return tarjeta.numero_fundador is None and not tarjeta.pagos.exists()


def beneficio_fundador_activo(tarjeta, config, ahora):
    """True si a la landing le rige el precio de renovación de fundador:
    es fundadora, no se pasó de la fecha de fin del beneficio y no dejó
    vencer la landing más allá de los días de gracia."""
    if tarjeta.numero_fundador is None or tarjeta.fundador_precio_hasta is None:
        return False
    if ahora > tarjeta.fundador_precio_hasta:
        return False
    if tarjeta.fecha_vencimiento is not None:
        limite = tarjeta.fecha_vencimiento + timedelta(days=config.fundador_dias_gracia)
        if ahora > limite:
            return False
    return True


def precio_base_mensual(tarjeta, config, ahora):
    """Precio base mensual aplicable a esta landing hoy (CLP)."""
    if beneficio_fundador_activo(tarjeta, config, ahora):
        return config.fundador_renovacion_precio_clp
    return config.precio_pro_clp


def calcular_planes(tarjeta, ahora, config=None):
    """Planes disponibles HOY para esta landing: lista de dicts con
    id, nombre, meses, monto (CLP), ahorro (CLP) y tarifa ('normal' |
    'fundador'). El plan Fundador solo aparece en la primera compra y
    mientras queden cupos; incluye `cupos_restantes`."""
    config = config or ConfiguracionTarjetas.obtener()
    base = precio_base_mensual(tarjeta, config, ahora)
    if base <= 0:
        return []
    tarifa = 'fundador' if beneficio_fundador_activo(tarjeta, config, ahora) else 'normal'

    semestral = (base * 6 * (100 - config.descuento_semestral_pct) + 50) // 100
    anual = base * config.anual_meses_pagados

    planes = []
    if es_primera_compra(tarjeta) and config.fundador_precio_clp > 0:
        cupos = cupos_fundador_restantes(config)
        if cupos > 0:
            planes.append({
                'id': PLAN_FUNDADOR, 'nombre': NOMBRES[PLAN_FUNDADOR],
                'meses': config.fundador_meses, 'monto': config.fundador_precio_clp,
                'ahorro': max(0, config.precio_pro_clp * config.fundador_meses - config.fundador_precio_clp),
                'tarifa': 'normal', 'cupos_restantes': cupos,
            })
    planes += [
        {'id': PLAN_MENSUAL, 'nombre': NOMBRES[PLAN_MENSUAL], 'meses': 1, 'monto': base,
         'ahorro': 0, 'tarifa': tarifa},
        {'id': PLAN_SEMESTRAL, 'nombre': NOMBRES[PLAN_SEMESTRAL], 'meses': 6, 'monto': semestral,
         'ahorro': max(0, base * 6 - semestral), 'tarifa': tarifa},
        {'id': PLAN_ANUAL, 'nombre': NOMBRES[PLAN_ANUAL], 'meses': 12, 'monto': anual,
         'ahorro': max(0, base * 12 - anual), 'tarifa': tarifa},
    ]
    return planes


def plan_disponible(tarjeta, plan_id, ahora, config=None):
    """El dict del plan si está disponible para esta landing, o None."""
    for plan in calcular_planes(tarjeta, ahora, config):
        if plan['id'] == plan_id:
            return plan
    return None
