// Temas de la landing Pro (Fase 6): cada clave de TEMAS_PRO corresponde a
// un valor de Tarjeta.plantilla ('pro_min', 'pro_mod', ...) y define la
// PIEL que PlantillaProBase.jsx aplica — nunca la estructura ni la lógica,
// que son idénticas para las 6.
//
// TANDA 1: las 6 apuntan al mismo tema por defecto (reproduce exactamente
// el diseño original de PlantillaPro antes del refactor) para no cambiar
// nada visual todavía. La diferenciación real de cada piel es la TANDA 2.
const TEMA_DEFECTO = {
  accent: '#0d9488',
  accentSoft: 'rgba(13,148,136,0.10)',
  bgClass: 'bg-white text-[#1a1d21]',
  fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  heroClass: '',
  cardClass: 'rounded-2xl border border-gray-100 bg-white shadow-sm',
}

export const TEMAS_PRO = {
  pro_min: TEMA_DEFECTO,
  pro_mod: TEMA_DEFECTO,
  pro_corp: TEMA_DEFECTO,
  pro_calido: TEMA_DEFECTO,
  pro_dark: TEMA_DEFECTO,
  pro_editorial: TEMA_DEFECTO,
}
