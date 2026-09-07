export const PLANTILLA_LABEL = {
  A: 'Elegante',
  B: 'Moderna',
  C: 'Link en bio',
  default: 'Link en bio',
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
