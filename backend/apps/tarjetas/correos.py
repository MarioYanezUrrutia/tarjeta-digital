# apps/tarjetas/correos.py
"""Correos transaccionales de la suscripción de una tarjeta (Cobro-3a):
aviso previo al vencimiento, corte por falta de pago, y confirmación de
pago. Texto plano, en español — usan `send_mail` de Django, que en dev
escribe el correo en la consola (EMAIL_BACKEND por defecto, ver
settings.py) y en producción se manda de verdad apenas se configure el
backend SMTP real vía `.env`. Ningún cambio de código hace falta para ese
cambio de ambiente.
"""
from django.conf import settings
from django.core.mail import send_mail

NOMBRE_REMITENTE_EQUIPO = 'Equipo Kabymur'


def _link_pago(tarjeta):
    """Link al panel de la tarjeta, donde el dueño ve el botón de
    Activar/Pagar (requiere su sesión + clave privada — Cobro-2). Se arma
    con `PUBLIC_BASE_URL` (nunca localhost hardcodeado), para que el mismo
    correo funcione en dev y en producción sin tocar código.

    TODO (mejora futura, fuera de esta fase): un link con un token único
    que lleve directo a la pantalla de pago sin tener que navegar/loguear
    de nuevo si la sesión expiró — la idea original de "paga en 10
    segundos". Por ahora el link solo lleva al panel de la tarjeta; el pago
    en sí sigue pasando por la sesión normal + clave privada.
    """
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/panel/tarjeta/{tarjeta.id}"


def _destinatarios(tarjeta):
    """Lista de destinatarios (hoy, solo el email del Cliente dueño). Vacía
    si no hay email — `send_mail` con lista vacía fallaría, así que los
    llamadores deben chequear antes de enviar."""
    email = (tarjeta.cliente.email or '').strip()
    return [email] if email else []


def _texto_dias(dias):
    """'hoy' / 'mañana' / 'en N días' — más natural que 'en 1 días'."""
    if dias is None or dias <= 0:
        return 'hoy'
    if dias == 1:
        return 'mañana'
    return f'en {dias} días'


def correo_aviso_vencimiento(tarjeta):
    """Aviso de que la tarjeta está por vencer — se manda cuando faltan
    TARJETA_DIAS_AVISO_PREVIO días o menos (ver el management command
    `revisar_vencimientos`). No hace nada si el cliente no tiene email."""
    destinatarios = _destinatarios(tarjeta)
    if not destinatarios:
        return
    nombre = tarjeta.nombre_mostrado or 'Tu tarjeta digital'
    mensaje = (
        f"Hola,\n\n"
        f"Tu tarjeta digital \"{nombre}\" vence {_texto_dias(tarjeta.dias_para_vencer())}.\n"
        f"Renuévala para que tu página siga publicada sin interrupciones.\n\n"
        f"Paga aquí: {_link_pago(tarjeta)}\n\n"
        f"Un saludo,\n{NOMBRE_REMITENTE_EQUIPO}"
    )
    send_mail(
        subject='Tu tarjeta digital está por vencer',
        message=mensaje,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinatarios,
    )


def correo_tarjeta_cortada(tarjeta):
    """Aviso de que la tarjeta se pausó por falta de pago — a partir de acá
    ya no se muestra públicamente (ver `Tarjeta.esta_vigente`)."""
    destinatarios = _destinatarios(tarjeta)
    if not destinatarios:
        return
    nombre = tarjeta.nombre_mostrado or 'Tu tarjeta digital'
    mensaje = (
        f"Hola,\n\n"
        f"Tu tarjeta digital \"{nombre}\" ha sido pausada por falta de pago "
        f"y ya no se muestra públicamente.\n\n"
        f"Actívala de nuevo aquí: {_link_pago(tarjeta)}\n\n"
        f"Un saludo,\n{NOMBRE_REMITENTE_EQUIPO}"
    )
    send_mail(
        subject='Tu tarjeta digital fue pausada',
        message=mensaje,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinatarios,
    )


def correo_pago_confirmado(tarjeta):
    """Confirmación simple de que el pago se procesó y la tarjeta quedó
    activa — se llama desde `pago_views.pagar_tarjeta` justo después de
    activarla/renovarla, solo si Banexa ya confirmó el cobro."""
    destinatarios = _destinatarios(tarjeta)
    if not destinatarios:
        return
    nombre = tarjeta.nombre_mostrado or 'Tu tarjeta digital'
    fecha = tarjeta.fecha_vencimiento.strftime('%d-%m-%Y') if tarjeta.fecha_vencimiento else ''
    mensaje = (
        f"Hola,\n\n"
        f"¡Tu tarjeta digital \"{nombre}\" está activa hasta el {fecha}!\n\n"
        f"Gracias por confiar en Kabymur.\n\n"
        f"Un saludo,\n{NOMBRE_REMITENTE_EQUIPO}"
    )
    send_mail(
        subject='¡Tu tarjeta digital está activa!',
        message=mensaje,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinatarios,
    )
