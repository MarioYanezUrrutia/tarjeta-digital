import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerCuposFundador } from '../api/tarjetas'
import { formatearCLP } from '../constants/tarjetas'
import MiniPreviewPlantilla from '../plantillas/MiniPreviewPlantilla'

// Montos de la oferta Fundador. El servidor solo entrega cupos y el
// equivalente mensual (/cupos-fundador/); el resto vive acá, en un único
// lugar. Deben coincidir con ConfiguracionTarjetas (admin).
const OFERTA = {
  pagoUnico: 9000,
  meses: 6,
  equivalenteMensual: 1500,
  cuposTotal: 100,
  renovacionMensual: 3500,
  renovacionMeses: 24,
  precioNormal: 5000,
}

const PASOS = [
  { titulo: 'Elige tu plantilla', texto: 'Doce estilos pensados para distintos rubros.' },
  { titulo: 'Arma tu página gratis', texto: 'Súbela con tus productos, fotos y datos desde el celular. Mientras no la publiques, solo tú la ves.' },
  { titulo: 'Paga solo al publicar', texto: 'Cuando estés conforme, activas tu plan y tu página queda visible.' },
]

const PLANTILLAS = [
  { valor: 'serena', nombre: 'Serena', rubro: 'Belleza' },
  { valor: 'confianza', nombre: 'Confianza', rubro: 'Oficios' },
  { valor: 'vacio', nombre: 'Vacío', rubro: 'Moderna oscura' },
  { valor: 'revista', nombre: 'Revista', rubro: 'Editorial' },
  { valor: 'pausa', nombre: 'Pausa', rubro: 'Salud y bienestar' },
  { valor: 'huella', nombre: 'Huella', rubro: 'Mascotas' },
  { valor: 'lustre', nombre: 'Lustre', rubro: 'Lujo' },
  { valor: 'mosaico', nombre: 'Mosaico', rubro: 'Bento de colores' },
  { valor: 'balance', nombre: 'Balance', rubro: 'Consultoría' },
  { valor: 'miga', nombre: 'Miga', rubro: 'Comida por encargo' },
  { valor: 'forma', nombre: 'Forma', rubro: 'Talleres' },
  { valor: 'tinta', nombre: 'Tinta', rubro: 'Eventos y música' },
]

const BOTON =
  'inline-flex w-full items-center justify-center rounded-lg bg-teal-600 px-6 py-3.5 text-base font-semibold text-white shadow transition hover:bg-teal-700 sm:w-auto'

function BloquePlan({ cupos }) {
  // Sin respuesta del servidor (o 0 cupos) se muestra el plan mensual normal.
  const hayCupos = cupos && cupos.cupos_restantes > 0
  if (!hayCupos) {
    return (
      <section className="px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">Plan mensual</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatearCLP(OFERTA.precioNormal)} al mes</p>
          <p className="mt-3 text-sm text-gray-600">Armas tu página gratis y pagas solo cuando la publiques.</p>
        </div>
      </section>
    )
  }
  const mensual = cupos.equivalente_mensual || OFERTA.equivalenteMensual
  const total = cupos.cupos_total || OFERTA.cuposTotal
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Plan Fundador</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          Precio Fundador: {formatearCLP(mensual)} al mes
        </p>
        <p className="mt-1 text-base font-medium text-amber-900">
          Quedan {cupos.cupos_restantes} de {total} cupos
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          Pago único de {formatearCLP(OFERTA.pagoUnico)} por {OFERTA.meses} meses, solo para los primeros {total}.
          Después, {formatearCLP(OFERTA.renovacionMensual)} al mes por {OFERTA.renovacionMeses} meses si renuevas a
          tiempo (precio normal {formatearCLP(OFERTA.precioNormal)}).
        </p>
      </div>
    </section>
  )
}

function preguntas(cupos) {
  const hayCupos = cupos && cupos.cupos_restantes > 0
  return [
    {
      p: '¿Necesito saber programar?',
      r: 'No. Armas tu página desde un editor en el celular: eliges la plantilla, escribes tus datos y subes tus productos.',
    },
    {
      p: '¿Cuánto cuesta?',
      r: hayCupos
        ? `Armarla es gratis. Para publicarla, el plan Fundador es un pago único de ${formatearCLP(OFERTA.pagoUnico)} por ${OFERTA.meses} meses, mientras queden cupos. Después rige el precio mensual normal de ${formatearCLP(OFERTA.precioNormal)}.`
        : `Armarla es gratis. Para publicarla, el plan mensual cuesta ${formatearCLP(OFERTA.precioNormal)} al mes.`,
    },
    ...(hayCupos
      ? [
          {
            p: '¿Qué pasa después de los 6 meses?',
            r: `Si renuevas a tiempo, pagas ${formatearCLP(OFERTA.renovacionMensual)} al mes durante ${OFERTA.renovacionMeses} meses, en vez de ${formatearCLP(OFERTA.precioNormal)}. Si no renuevas a tiempo, se aplica el precio normal.`,
          },
        ]
      : []),
    {
      p: '¿Cómo pago?',
      r: 'Con Mercado Pago, desde tu panel, cuando decidas publicar.',
    },
    {
      p: '¿Qué dirección tendrá mi página?',
      r: 'Tendrá la forma tarjeta.kabymur.com/t/nombre-de-tu-negocio, armada con el nombre que le pongas.',
    },
    {
      p: '¿Qué pasa si dejo de pagar?',
      r: 'Antes de vencer te avisamos por correo. Si vence, tu página deja de mostrarse al público; puedes volver a activarla pagando de nuevo.',
    },
  ]
}

export default function Portada() {
  const [cupos, setCupos] = useState(null)

  useEffect(() => {
    let activo = true
    obtenerCuposFundador()
      .then(({ status, datos }) => {
        if (activo && status === 200 && datos) setCupos(datos)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <section className="px-4 pb-6 pt-12 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Tu negocio con página web propia, armada por ti desde el celular
          </h1>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            Productos con precio, novedades, opiniones de clientes y botón directo a WhatsApp. Sin saber programar.
          </p>
          <div className="mt-8">
            <Link to="/login" className={BOTON}>
              Empieza gratis
            </Link>
          </div>
        </div>
      </section>

      <BloquePlan cupos={cupos} />

      <section className="px-4 py-10">
        <h2 className="text-center text-2xl font-bold">Cómo funciona</h2>
        <ol className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="rounded-xl border border-gray-200 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{paso.titulo}</h3>
              <p className="mt-1 text-sm text-gray-600">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 py-10">
        <h2 className="text-center text-2xl font-bold">12 plantillas para tu rubro</h2>
        <ul className="mx-auto mt-6 grid max-w-4xl grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {PLANTILLAS.map((p) => (
            <li key={p.valor} className="flex flex-col items-center gap-2 text-center">
              <MiniPreviewPlantilla plantilla={p.valor} />
              <p className="text-sm font-semibold">{p.nombre}</p>
              <p className="-mt-1 text-xs text-gray-500">{p.rubro}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <Link to="/login" className={BOTON}>
            Empieza gratis
          </Link>
        </div>
      </section>

      <section className="px-4 py-10">
        <h2 className="text-center text-2xl font-bold">Preguntas frecuentes</h2>
        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3">
          {preguntas(cupos).map((f) => (
            <details key={f.p} className="rounded-xl border border-gray-200 bg-white p-4">
              <summary className="cursor-pointer font-medium">{f.p}</summary>
              <p className="mt-2 text-sm text-gray-600">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 px-4 py-8 text-center text-sm text-gray-600">
        <Link to="/login" className="font-medium text-gray-900 underline">
          Iniciar sesión
        </Link>
        <p className="mt-3">Hecho con Kabymur</p>
      </footer>
    </div>
  )
}
