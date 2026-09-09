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

// Los valores de un vCard usan ; , \ y saltos de linea como separadores del
// formato — hay que escaparlos si vienen dentro de un dato (ver RFC 6350).
function escaparVCard(valor) {
  return String(valor)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Arma el contenido de un archivo vCard 3.0 (el mas compatible con
 * agendas de iOS/Android) con los datos publicos de una tarjeta —
 * solo incluye los campos que tengan valor. */
export function generarVCard(tarjeta) {
  const {
    nombre_mostrado, empresa, cargo_rubro, profesion,
    telefono, whatsapp, email_contacto, sitio_web,
    instagram, facebook, linkedin, tiktok, youtube, x_twitter,
  } = tarjeta

  const nombre = (nombre_mostrado || '').trim() || 'Contacto'
  const titulo = cargo_rubro || profesion

  const lineas = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escaparVCard(nombre)}`, `N:${escaparVCard(nombre)};;;;`]

  if (empresa) lineas.push(`ORG:${escaparVCard(empresa)}`)
  if (titulo) lineas.push(`TITLE:${escaparVCard(titulo)}`)
  if (telefono) lineas.push(`TEL;TYPE=WORK,VOICE:${escaparVCard(telefono)}`)
  if (whatsapp && whatsapp !== telefono) lineas.push(`TEL;TYPE=CELL:${escaparVCard(whatsapp)}`)
  if (email_contacto) lineas.push(`EMAIL;TYPE=INTERNET:${escaparVCard(email_contacto)}`)
  if (sitio_web) lineas.push(`URL:${escaparVCard(sitio_web)}`)
  ;[instagram, facebook, linkedin, tiktok, youtube, x_twitter]
    .filter(Boolean)
    .forEach((url) => lineas.push(`URL:${escaparVCard(url)}`))

  lineas.push('END:VCARD')
  return lineas.join('\r\n')
}

// Tras normalize('NFD') los acentos quedan como caracteres combinantes
// aparte (ej. "a" + U+0301) — hay que quitarlos antes de filtrar a
// alfanumerico o "María" quedaria "Mari_a" en vez de "Maria".
function limpiarNombreArchivo(nombre) {
  const limpio = (nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return limpio || 'contacto'
}

/** Dispara la descarga del .vcf de una tarjeta (Blob + <a download>) —
 * al abrirlo en un celular, el sistema ofrece agregarlo a los contactos. */
export function descargarVCard(tarjeta) {
  const contenido = generarVCard(tarjeta)
  const blob = new Blob([contenido], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${limpiarNombreArchivo(tarjeta.nombre_mostrado)}.vcf`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
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
