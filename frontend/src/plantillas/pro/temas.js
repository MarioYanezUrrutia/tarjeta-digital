// Temas de la landing Pro (Fase 6): cada clave de TEMAS_PRO corresponde a
// un valor de Tarjeta.plantilla ('pro_min', 'pro_mod', ...) y define la
// PIEL COMPLETA que PlantillaProBase.jsx aplica — nunca la estructura ni
// la lógica (nav, hamburguesa, formulario, flags), que son idénticas para
// las 6. Fuentes Google cargadas vía @import en index.css.
//
// Contrato de cada tema (todas las claves son obligatorias):
//   accent             color primario (hex) — botones sólidos, iconos, links de color
//   accentSoft         tinte suave del accent (rgba/hex) — placeholders de imagen, badges de icono
//   accentTextClass    color de texto SOBRE fondos `accent` sólido (blanco por defecto; oro/claro necesita texto oscuro)
//   bgClass            fondo + color de texto base de toda la página (root)
//   fontFamily         fuente de cuerpo (CSS font-family)
//   headingFontFamily  fuente de títulos (h1/h2/nombre en el nav)
//   navClass           fondo/blur/borde de la barra de navegación sticky
//   mobileMenuClass    fondo/blur/borde del panel desplegable móvil
//   navLinkClass       color (+hover) de los links de nav (desktop, móvil y botón hamburguesa)
//   heroClass          clases extra sobre el <header> (borde, padding)
//   heroOverlayBg      valor CSS `background` del degradado decorativo del hero
//   heroTextClass      color de texto del contenido del hero (nombre, h1)
//   heroMutedClass     color del texto secundario del hero (profesión, eslogan)
//   heroSecondaryBtnClass  className completo del botón "Guardar contacto"
//   cardClass          fondo+borde+radio de las "cajas" (productos, noticias, testimonios, ubicación, formulario, FAQ)
//   borderClass        color de borde hairline (footer, links de contacto/redes, inputs)
//   dividerClass        color de las líneas divisorias del acordeón de FAQ (divide-*)
//   hoverClass         fondo hover de los links de contacto/redes
//   textBodyClass      color del texto de párrafo principal (sobre mí, detalle, cita de testimonio)
//   textMutedClass     color del texto secundario/pequeño (fechas, captions, "powered by")
//   h1Class            className completo del <h1> del hero
//   h2Class            className completo de los <h2> de cada sección
//   sectionClass       clases extra por <section> (para temas con líneas divisorias entre secciones)

// 1) MINIMALISTA — blanco puro, mucho espacio, acento casi negro, Inter
// fina, sin sombras, bordes hairline. Elegancia por sustracción.
const TEMA_MIN = {
  accent: '#111111',
  accentSoft: 'rgba(17,17,17,0.05)',
  accentTextClass: 'text-white',
  bgClass: 'bg-white text-[#1a1a1a]',
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  navClass: 'border-b border-gray-100 bg-white/90 backdrop-blur',
  mobileMenuClass: 'border-b border-gray-100 bg-white/95 backdrop-blur',
  navLinkClass: 'text-sm text-gray-400 transition hover:text-[#1a1a1a]',
  heroClass: '',
  heroOverlayBg: 'transparent',
  heroTextClass: 'text-[#1a1a1a]',
  heroMutedClass: 'text-gray-400',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-[#1a1a1a] transition hover:bg-gray-50',
  cardClass: 'rounded-xl border border-gray-100 bg-white',
  borderClass: 'border-gray-100',
  dividerClass: 'divide-y divide-gray-100',
  hoverClass: 'hover:bg-gray-50',
  textBodyClass: 'text-gray-600',
  textMutedClass: 'text-gray-400',
  h1Class: 'text-4xl font-light tracking-tight sm:text-5xl',
  h2Class: 'text-xl font-light tracking-tight',
  sectionClass: '',
}

// 2) MODERNA — gradiente violeta→fucsia→coral en el hero, botones
// píldora, cards con hover que escala, Poppins geométrica. Energía y color.
const TEMA_MOD = {
  accent: '#c026d3',
  accentSoft: 'rgba(192,38,211,0.12)',
  accentTextClass: 'text-white',
  bgClass: 'bg-white text-[#1a1d21]',
  fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
  navClass: 'border-b border-black/5 bg-white/80 backdrop-blur',
  mobileMenuClass: 'border-b border-black/5 bg-white/95 backdrop-blur',
  navLinkClass: 'text-sm text-gray-500 transition hover:text-[#1a1d21]',
  heroClass: '',
  heroOverlayBg: 'linear-gradient(135deg, #7c3aed 0%, #d6336c 55%, #ff7849 100%)',
  heroTextClass: 'text-white',
  heroMutedClass: 'text-white/80',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20',
  cardClass: 'rounded-3xl border border-gray-100 bg-white shadow-sm',
  borderClass: 'border-gray-100',
  dividerClass: 'divide-y divide-gray-100',
  hoverClass: 'hover:bg-gray-50',
  textBodyClass: 'text-gray-600',
  textMutedClass: 'text-gray-400',
  h1Class: 'text-4xl font-bold sm:text-5xl',
  h2Class: 'text-2xl font-bold',
  sectionClass: '',
}

// 3) CORPORATIVA — azul serio, estructura firme con líneas divisorias
// entre secciones, IBM Plex Sans. Sensación sólida y profesional.
const TEMA_CORP = {
  accent: '#1e40af',
  accentSoft: 'rgba(37,99,235,0.08)',
  accentTextClass: 'text-white',
  bgClass: 'bg-white text-[#111827]',
  fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  navClass: 'border-b border-gray-200 bg-white',
  mobileMenuClass: 'border-b border-gray-200 bg-white',
  navLinkClass: 'text-sm text-gray-500 transition hover:text-[#1e40af]',
  heroClass: 'border-b border-gray-200',
  heroOverlayBg: 'linear-gradient(160deg, rgba(37,99,235,0.08) 0%, rgba(255,255,255,0) 55%)',
  heroTextClass: 'text-[#111827]',
  heroMutedClass: 'text-gray-500',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-[#111827] transition hover:bg-gray-50',
  cardClass: 'rounded-md border border-gray-200 bg-white',
  borderClass: 'border-gray-200',
  dividerClass: 'divide-y divide-gray-200',
  hoverClass: 'hover:bg-gray-50',
  textBodyClass: 'text-gray-600',
  textMutedClass: 'text-gray-500',
  h1Class: 'text-3xl font-semibold sm:text-4xl',
  h2Class: 'text-2xl font-semibold border-b border-gray-200 pb-3',
  sectionClass: 'border-t border-gray-200 pt-10',
}

// 4) CÁLIDA — terracota + crema, bordes redondeados generosos, Fraunces
// en títulos + Nunito en texto. Cercana y hogareña.
const TEMA_CALIDO = {
  accent: '#c2673f',
  accentSoft: 'rgba(194,103,63,0.14)',
  accentTextClass: 'text-white',
  bgClass: 'bg-[#faf3e8] text-[#4a3728]',
  fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'Fraunces', ui-serif, Georgia, serif",
  navClass: 'border-b border-[#e8d9c3] bg-[#faf3e8]/90 backdrop-blur',
  mobileMenuClass: 'border-b border-[#e8d9c3] bg-[#faf3e8]/95 backdrop-blur',
  navLinkClass: 'text-sm text-[#8a7462] transition hover:text-[#4a3728]',
  heroClass: '',
  heroOverlayBg: 'linear-gradient(160deg, rgba(194,103,63,0.16) 0%, rgba(250,243,232,0) 60%)',
  heroTextClass: 'text-[#4a3728]',
  heroMutedClass: 'text-[#8a7462]',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-full border border-[#e8d9c3] bg-white/60 px-6 py-3 text-sm font-medium text-[#4a3728] transition hover:bg-white',
  cardClass: 'rounded-3xl border border-[#e8d9c3] bg-white/70',
  borderClass: 'border-[#e8d9c3]',
  dividerClass: 'divide-y divide-[#e8d9c3]',
  hoverClass: 'hover:bg-white/60',
  textBodyClass: 'text-[#6b5645]',
  textMutedClass: 'text-[#a1876f]',
  h1Class: 'text-4xl font-semibold sm:text-5xl',
  h2Class: 'text-2xl font-semibold',
  sectionClass: '',
}

// 5) OSCURA PREMIUM — casi negro con acento dorado/metálico, Playfair
// Display en títulos + sans en texto. Lujo, contraste, sofisticación.
const TEMA_DARK = {
  accent: '#c9a24b',
  accentSoft: 'rgba(201,162,75,0.16)',
  accentTextClass: 'text-[#0d0d0f]',
  bgClass: 'bg-[#0d0d0f] text-[#f2ead9]',
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'Playfair Display', ui-serif, Georgia, serif",
  navClass: 'border-b border-white/10 bg-[#0d0d0f]/85 backdrop-blur',
  mobileMenuClass: 'border-b border-white/10 bg-[#0d0d0f]/95 backdrop-blur',
  navLinkClass: 'text-sm text-[#b8ac95] transition hover:text-[#f2ead9]',
  heroClass: '',
  heroOverlayBg: 'linear-gradient(160deg, rgba(201,162,75,0.18) 0%, rgba(13,13,15,0) 60%)',
  heroTextClass: 'text-[#f2ead9]',
  heroMutedClass: 'text-[#b8ac95]',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-[#f2ead9] transition hover:bg-white/10',
  cardClass: 'rounded-2xl border border-white/10 bg-white/[0.04]',
  borderClass: 'border-white/10',
  dividerClass: 'divide-y divide-white/10',
  hoverClass: 'hover:bg-white/5',
  textBodyClass: 'text-[#cbbfa8]',
  textMutedClass: 'text-[#8a8070]',
  h1Class: 'text-4xl font-semibold sm:text-5xl',
  h2Class: 'text-2xl font-semibold',
  sectionClass: '',
}

// 6) EDITORIAL — blanco y negro con un acento puntual, tipografía enorme
// tipo revista (Libre Baskerville), mucho contraste de tamaños.
const TEMA_EDITORIAL = {
  accent: '#c81e3a',
  accentSoft: 'rgba(200,30,58,0.08)',
  accentTextClass: 'text-white',
  bgClass: 'bg-white text-black',
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  headingFontFamily: "'Libre Baskerville', ui-serif, Georgia, serif",
  navClass: 'border-b border-black bg-white',
  mobileMenuClass: 'border-b border-black bg-white',
  navLinkClass: 'text-sm text-gray-500 transition hover:text-black',
  heroClass: 'border-b-4 border-black',
  heroOverlayBg: 'transparent',
  heroTextClass: 'text-black',
  heroMutedClass: 'text-gray-500',
  heroSecondaryBtnClass: 'flex items-center gap-2 rounded-none border border-black px-6 py-3 text-sm font-medium text-black transition hover:bg-black hover:text-white',
  cardClass: 'rounded-none border border-black bg-white',
  borderClass: 'border-black',
  dividerClass: 'divide-y divide-black',
  hoverClass: 'hover:bg-gray-50',
  textBodyClass: 'text-gray-700',
  textMutedClass: 'text-gray-500',
  h1Class: 'text-5xl font-bold tracking-tight sm:text-7xl',
  h2Class: 'text-4xl font-bold tracking-tight',
  sectionClass: '',
}

export const TEMAS_PRO = {
  pro_min: TEMA_MIN,
  pro_mod: TEMA_MOD,
  pro_corp: TEMA_CORP,
  pro_calido: TEMA_CALIDO,
  pro_dark: TEMA_DARK,
  pro_editorial: TEMA_EDITORIAL,
}
