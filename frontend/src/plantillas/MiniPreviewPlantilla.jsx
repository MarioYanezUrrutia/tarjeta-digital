import React from 'react'
import { iniciales } from './useDatosTarjeta'

// Datos fijos de muestra — nunca los del usuario, es solo una vitrina del
// estilo. Los tokens de color/fondo/forma de botón de cada variante son
// literalmente los mismos que usan PlantillaA/B/C (ver esos archivos): si
// alguna cambia su paleta, esta miniatura debe actualizarse a mano junto
// con ella para seguir siendo fiel al resultado real.
const NOMBRE_EJEMPLO = 'Ana Bravo'
const CARGO_EJEMPLO = 'Diseñadora'
const BOTONES_EJEMPLO = ['WhatsApp', 'Instagram', 'Sitio web']

const TEMAS = {
  A: {
    fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    contenedorClassName: 'bg-white text-[#22262b] border border-[#eceef0]',
    avatarClassName: 'border border-[#d7dade] bg-[#f6f7f8] text-[#6b7177]',
    nombreClassName: 'text-[#22262b]',
    cargoClassName: 'text-[#6b7177]',
    botonClassName: 'rounded-[4px] border border-[#dfe2e5] bg-white text-[#22262b]',
  },
  B: {
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    contenedorStyle: { background: 'linear-gradient(150deg, #6a5cff 0%, #9b4dff 42%, #ff5c8a 100%)' },
    contenedorClassName: 'text-white',
    avatarClassName: 'border-2 border-white bg-white/20 text-white',
    nombreClassName: 'text-white',
    cargoClassName: 'text-white/70',
    botonClassName: 'rounded-full bg-white/[.18] text-white backdrop-blur-sm',
  },
  C: {
    contenedorClassName: 'bg-[#16181f] text-white',
    avatarClassName: 'border-2 border-[#2dd4bf] bg-[#21242e] text-[#2dd4bf]',
    nombreClassName: 'text-white',
    cargoClassName: 'text-gray-300',
    botonClassName: 'rounded-[6px] bg-[#21242e] text-white',
  },
  // Pro (Fase 6) — colores/tipografía tomados a mano de
  // plantillas/pro/temas.js; si un tema Pro cambia su paleta, actualizar
  // también acá (no se derivan programáticamente porque las clases
  // Tailwind con valores arbitrarios deben ser texto literal para que el
  // escaneo estático de Tailwind las detecte).
  pro_min: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    contenedorClassName: 'bg-white text-[#1a1a1a] border border-gray-100',
    avatarClassName: 'border border-gray-200 bg-gray-50 text-[#1a1a1a]',
    nombreClassName: 'text-[#1a1a1a]',
    cargoClassName: 'text-gray-400',
    botonClassName: 'rounded-full border border-gray-200 bg-white text-[#1a1a1a]',
  },
  pro_mod: {
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    contenedorStyle: { background: 'linear-gradient(135deg, #7c3aed 0%, #d6336c 55%, #ff7849 100%)' },
    contenedorClassName: 'text-white',
    avatarClassName: 'border-2 border-white bg-white/20 text-white',
    nombreClassName: 'text-white',
    cargoClassName: 'text-white/80',
    botonClassName: 'rounded-full bg-white/20 text-white backdrop-blur-sm',
  },
  pro_corp: {
    fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    contenedorClassName: 'bg-white text-[#111827] border border-gray-200',
    avatarClassName: 'border border-[#1e40af] bg-[#eaf0fd] text-[#1e40af]',
    nombreClassName: 'text-[#111827]',
    cargoClassName: 'text-gray-500',
    botonClassName: 'rounded-[4px] border border-gray-300 bg-white text-[#111827]',
  },
  pro_calido: {
    fontFamily: "'Fraunces', ui-serif, Georgia, serif",
    contenedorClassName: 'bg-[#faf3e8] text-[#4a3728] border border-[#e8d9c3]',
    avatarClassName: 'border border-[#c2673f] bg-white text-[#c2673f]',
    nombreClassName: 'text-[#4a3728]',
    cargoClassName: 'text-[#8a7462]',
    botonClassName: 'rounded-full bg-[#c2673f] text-white',
  },
  pro_dark: {
    fontFamily: "'Playfair Display', ui-serif, Georgia, serif",
    contenedorClassName: 'bg-[#0d0d0f] text-[#f2ead9] border border-white/10',
    avatarClassName: 'border border-[#c9a24b] bg-white/5 text-[#c9a24b]',
    nombreClassName: 'text-[#f2ead9]',
    cargoClassName: 'text-[#b8ac95]',
    botonClassName: 'rounded-full border border-[#c9a24b]/50 bg-[#c9a24b]/10 text-[#c9a24b]',
  },
  pro_editorial: {
    fontFamily: "'Libre Baskerville', ui-serif, Georgia, serif",
    contenedorClassName: 'bg-white text-black border border-black',
    avatarClassName: 'border border-black bg-white text-black',
    nombreClassName: 'text-black',
    cargoClassName: 'text-gray-500',
    botonClassName: 'rounded-none border border-black bg-white text-black',
  },
}

/** Miniatura representativa (~140px) de una plantilla, con datos de
 * ejemplo fijos — para el selector del editor. NO es la plantilla
 * completa, solo el fondo, el avatar con iniciales, nombre/cargo y unos
 * botones de muestra con el estilo real de esa variante. */
export default function MiniPreviewPlantilla({ plantilla }) {
  const tema = TEMAS[plantilla] || TEMAS.C

  return (
    <div
      className={`flex w-[140px] flex-col items-center gap-2 rounded-xl p-3 shadow-sm ${tema.contenedorClassName}`}
      style={{ ...tema.contenedorStyle, fontFamily: tema.fontFamily }}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${tema.avatarClassName}`}
      >
        {iniciales(NOMBRE_EJEMPLO)}
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-semibold leading-tight ${tema.nombreClassName}`}>{NOMBRE_EJEMPLO}</p>
        <p className={`text-[8px] leading-tight ${tema.cargoClassName}`}>{CARGO_EJEMPLO}</p>
      </div>
      <div className="flex w-full flex-col gap-1">
        {BOTONES_EJEMPLO.map((label) => (
          <div
            key={label}
            className={`truncate px-2 py-1 text-center text-[7px] font-medium ${tema.botonClassName}`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
