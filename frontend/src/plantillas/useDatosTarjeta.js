import {
  IconWhatsapp, IconPhone, IconMail, IconGlobe,
  IconInstagram, IconFacebook, IconLinkedin, IconTiktok, IconYoutube, IconX,
} from './icons'

// Lógica de datos y de flags COMPARTIDA por las tres plantillas (A, B, C).
// Cada plantilla solo decide cómo se ve un botón/sección; qué botones y
// secciones existen se calcula una sola vez, acá.

export function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/).slice(0, 2)
  return partes.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function formatearUrl(url) {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

export function useDatosTarjeta(tarjeta) {
  const {
    whatsapp, telefono, email_contacto, sitio_web,
    instagram, facebook, linkedin, tiktok, youtube, x_twitter,
    mostrar_contacto, mostrar_redes, mostrar_ubicacion, mostrar_productos,
    direccion, horario, productos,
  } = tarjeta

  const contactos = mostrar_contacto ? [
    whatsapp && { key: 'whatsapp', href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`, Icon: IconWhatsapp, label: 'WhatsApp', valor: whatsapp },
    telefono && { key: 'telefono', href: `tel:${telefono}`, Icon: IconPhone, label: 'Llamar', valor: telefono },
    email_contacto && { key: 'email', href: `mailto:${email_contacto}`, Icon: IconMail, label: 'Correo', valor: email_contacto },
    sitio_web && { key: 'web', href: sitio_web, Icon: IconGlobe, label: 'Sitio web', valor: formatearUrl(sitio_web) },
  ].filter(Boolean) : []

  const redes = mostrar_redes ? [
    instagram && { key: 'instagram', href: instagram, Icon: IconInstagram, label: 'Instagram' },
    facebook && { key: 'facebook', href: facebook, Icon: IconFacebook, label: 'Facebook' },
    linkedin && { key: 'linkedin', href: linkedin, Icon: IconLinkedin, label: 'LinkedIn' },
    tiktok && { key: 'tiktok', href: tiktok, Icon: IconTiktok, label: 'TikTok' },
    youtube && { key: 'youtube', href: youtube, Icon: IconYoutube, label: 'YouTube' },
    x_twitter && { key: 'x', href: x_twitter, Icon: IconX, label: 'X (Twitter)' },
  ].filter(Boolean) : []

  const mostrarUbicacionSeccion = Boolean(mostrar_ubicacion && (direccion || horario))
  const mostrarProductosSeccion = Boolean(mostrar_productos && productos && productos.length > 0)

  return { contactos, redes, mostrarUbicacionSeccion, mostrarProductosSeccion }
}
