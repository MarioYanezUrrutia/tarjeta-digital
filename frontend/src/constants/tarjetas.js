export const PLANTILLA_LABEL = {
  A: 'Elegante',
  B: 'Moderna',
  C: 'Link en bio',
  default: 'Link en bio',
  pro_min: 'Pro — Minimalista',
  pro_mod: 'Pro — Moderna',
  pro_corp: 'Pro — Corporativa',
  pro_calido: 'Pro — Cálida',
  pro_dark: 'Pro — Oscura Premium',
  pro_editorial: 'Pro — Editorial',
  serena: 'Pro — Serena',
  confianza: 'Pro — Confianza',
  vacio: 'Pro — Vacío',
  revista: 'Pro — Revista',
  pausa: 'Pro — Pausa',
  huella: 'Pro — Huella',
  lustre: 'Pro — Lustre',
  mosaico: 'Pro — Mosaico',
}

export const ESTADO_LABEL = {
  borrador: 'Borrador',
  activa: 'Activa',
  vencida: 'Vencida',
  cortada: 'Cortada',
}

export function formatearFecha(fechaIso) {
  if (!fechaIso) return ''
  return new Date(fechaIso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// dd-mm-aaaa en hora local
export function formatearFechaCorta(fechaIso) {
  if (!fechaIso) return ''
  const d = new Date(fechaIso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

// Monto en CLP con formato chileno: $5.000. Solo formatea, nunca calcula.
const formatoCLP = new Intl.NumberFormat('es-CL')
export function formatearCLP(monto) {
  return `$${formatoCLP.format(monto)}`
}

// Precio de un producto para mostrar: "$25.000" o "Desde $25.000". Cadena
// vacía si no tiene precio (nunca "$0" ni texto de relleno).
export function textoPrecioProducto(producto) {
  const precio = producto && producto.precio_clp
  if (!precio) return ''
  return `${producto.precio_desde ? 'Desde ' : ''}${formatearCLP(precio)}`
}

// Para el input del editor: "25000" -> "25.000" mientras se escribe.
export function formatearPrecioInput(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '').replace(/^0+/, '')
  return digitos ? formatoCLP.format(Number(digitos)) : ''
}

// Texto claro para el panel/editor — "Activa hasta 12 mar 2026" en vez de
// solo "Activa", que no dice cuándo se corta.
export function descripcionEstado(estado, fechaVencimiento) {
  if (estado === 'borrador') return 'Borrador (sin publicar)'
  if (estado === 'activa' && fechaVencimiento) return `Activa hasta ${formatearFecha(fechaVencimiento)}`
  return ESTADO_LABEL[estado] || estado
}

export const PLANTILLAS_DISPONIBLES = [
  { valor: 'C', nombre: 'Link en bio', descripcion: 'Fondo oscuro, botones grandes apilados — el clásico "link en bio".' },
  { valor: 'A', nombre: 'Elegante', descripcion: 'Fondo blanco, tipografía fina, bordes sutiles — sobria y clara.' },
  { valor: 'B', nombre: 'Moderna', descripcion: 'Degradado de color, botones tipo píldora — vistosa y colorida.' },
]

// Landing dinámica del plan Pro (Fase 6) — mismo patrón que
// PLANTILLAS_DISPONIBLES, pero para las 6 pieles de PlantillaProBase (ver
// frontend/src/plantillas/pro/temas.js). En la TANDA 1 las 6 se ven
// iguales (mismo tema por defecto); las descripciones ya anticipan cómo
// se van a diferenciar en la TANDA 2.
export const PLANTILLAS_PRO_DISPONIBLES = [
  { valor: 'pro_min', nombre: 'Minimalista', descripcion: 'Blanco y espacioso, acento teal — limpia y directa.' },
  { valor: 'pro_mod', nombre: 'Moderna', descripcion: 'Colores vivos y formas redondeadas — fresca y llamativa.' },
  { valor: 'pro_corp', nombre: 'Corporativa', descripcion: 'Azules serios, tipografía sobria — confianza y profesionalismo.' },
  { valor: 'pro_calido', nombre: 'Cálida', descripcion: 'Tonos tierra y texturas suaves — cercana y hogareña.' },
  { valor: 'pro_dark', nombre: 'Oscura Premium', descripcion: 'Fondo oscuro con acentos dorados — elegante y exclusiva.' },
  { valor: 'pro_editorial', nombre: 'Editorial', descripcion: 'Tipografía grande tipo revista — enfocada en contenido.' },
  { valor: 'serena', nombre: 'Serena', descripcion: 'Belleza: tonos rosados y tipografía con serif, arco en el hero.' },
  { valor: 'confianza', nombre: 'Confianza', descripcion: 'Oficios: WhatsApp directo, zonas que cubres y trabajos con precio.' },
  { valor: 'vacio', nombre: 'Vacío', descripcion: 'Moderna oscura: tipografía enorme y acento rosa.' },
  { valor: 'revista', nombre: 'Revista', descripcion: 'Editorial: titular grande, texto en columnas y cita final.' },
  { valor: 'pausa', nombre: 'Pausa', descripcion: 'Salud y bienestar: tonos arcilla y salvia, pasos de "Cómo trabajo".' },
  { valor: 'huella', nombre: 'Huella', descripcion: 'Mascotas: colores alegres, servicios como tickets y reseñas en fichas.' },
  { valor: 'lustre', nombre: 'Lustre', descripcion: 'Lujo metálico: fondo oscuro, dorado y carta con puntos guía.' },
  { valor: 'mosaico', nombre: 'Mosaico', descripcion: 'Bento: cada dato en su propia tarjeta de colores.' },
]
