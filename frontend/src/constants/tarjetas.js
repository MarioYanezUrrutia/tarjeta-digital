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
]
