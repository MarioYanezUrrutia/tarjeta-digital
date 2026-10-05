import React, { useEffect, useState } from 'react'
import { crearPagoMercadoPago, obtenerCuposFundador, obtenerEstadoPago, obtenerPlanesPro, pagarTarjeta } from '../api/tarjetas'
import { formatearCLP, formatearFecha, formatearFechaCorta } from '../constants/tarjetas'

// "2 meses gratis" del plan Anual, deducido del ahorro que devuelve el
// servidor: solo si el ahorro equivale a meses exactos del plan mensual.
function mesesGratis(plan, planes) {
  if (plan.id !== 'anual' || !(plan.ahorro > 0)) return 0
  const mensual = planes.find((p) => p.id === 'mensual')
  if (!mensual || mensual.monto <= 0 || plan.ahorro % mensual.monto !== 0) return 0
  return plan.ahorro / mensual.monto
}

// Pago real de la suscripción (Cobro-2): consulta precio/saldo, cobra Terras
// vía el backend (que a su vez cobra en Banexa) y, solo si Banexa confirma,
// la tarjeta pasa a activa. La clave privada vive en un input type="password"
// y en un solo estado local que se limpia apenas se usa — nunca se loguea.
export default function ModalPago({ tarjetaId, esPro, onCerrar, onPagoExitoso }) {
  const [cargando, setCargando] = useState(true)
  const [estadoPago, setEstadoPago] = useState(null)
  const [clavePrivada, setClavePrivada] = useState('')
  const [pagando, setPagando] = useState(false)
  const [error, setError] = useState(null)
  // { url } cuando Banexa dice que el usuario aún no creó su clave privada
  const [sinClave, setSinClave] = useState(null)
  const [exito, setExito] = useState(null)
  const [mpCargando, setMpCargando] = useState(false)
  const [mpError, setMpError] = useState('')
  const [planes, setPlanes] = useState([])
  const [planesCargando, setPlanesCargando] = useState(!!esPro)
  const [planesError, setPlanesError] = useState('')
  const [planElegido, setPlanElegido] = useState(null)
  const [fundadorPrecioHasta, setFundadorPrecioHasta] = useState(null)
  const [cuposTotal, setCuposTotal] = useState(null)
  const planActual = planes.find((p) => p.id === planElegido) || null

  // Landing Pro: los planes y sus montos vienen calculados del servidor.
  useEffect(() => {
    if (!esPro) return undefined
    let activo = true
    obtenerPlanesPro(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200 && Array.isArray(datos?.planes)) {
        setPlanes(datos.planes)
        setFundadorPrecioHasta(datos.fundador_precio_hasta || null)
        const fundador = datos.planes.find((p) => p.id === 'fundador')
        setPlanElegido((fundador || datos.planes.find((p) => p.id === 'mensual') || datos.planes[0] || {}).id || null)
      } else {
        setPlanesError(datos?.error || 'No se pudieron cargar los planes.')
      }
      setPlanesCargando(false)
    })
    obtenerCuposFundador().then(({ status, datos }) => {
      if (activo && status === 200) setCuposTotal(datos?.cupos_total ?? null)
    })
    return () => {
      activo = false
    }
  }, [tarjetaId, esPro])

  useEffect(() => {
    let activo = true
    if (esPro) return undefined
    obtenerEstadoPago(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200) {
        setEstadoPago(datos)
      } else {
        setError(datos?.error || 'No se pudo consultar el estado de pago.')
      }
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [tarjetaId])

  async function onPagar(evento) {
    evento.preventDefault()
    setError(null)
    setSinClave(null)
    setPagando(true)
    const { status, datos } = await pagarTarjeta(tarjetaId, clavePrivada)
    setPagando(false)
    setClavePrivada('') // no dejar la clave en memoria mas de lo necesario

    if (status === 200 && datos?.ok) {
      setExito(datos)
      onPagoExitoso(datos)
      setTimeout(onCerrar, 1500)
    } else if (datos?.codigo === 'sin_clave_privada') {
      setSinClave({ url: datos.url_clave || '' })
    } else {
      setError(datos?.error || 'No se pudo procesar el pago.')
    }
  }

  async function onPagarMP() {
    if (mpCargando || !planElegido) return
    setMpError('')
    setMpCargando(true)
    const { status, datos } = await crearPagoMercadoPago(tarjetaId, planElegido)
    if (status === 200 && datos?.ok && datos.url) {
      window.location.href = datos.url // redirige a Mercado Pago
      return
    }
    setMpCargando(false)
    setMpError(datos?.error || 'No se pudo iniciar el pago con Mercado Pago.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{esPro ? 'Activar landing' : 'Activar tarjeta'}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-lg leading-none text-gray-400 transition hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {!esPro && cargando && <p className="text-sm text-gray-500">Consultando tu saldo de Terras...</p>}

        {!esPro && !cargando && exito && (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            ¡Tu tarjeta está activa hasta {formatearFecha(exito.fecha_vencimiento)}!
          </p>
        )}

        {!esPro && !cargando && !exito && estadoPago && (
          <form onSubmit={onPagar} className="flex flex-col gap-4">
            <p className="text-sm text-gray-700">
              Tu tarjeta cuesta <strong>{estadoPago.precio} Terras</strong> al mes.
            </p>
            <p className="text-sm text-gray-700">
              Tu saldo actual:{' '}
              {estadoPago.saldo_disponible ? (
                <strong>{estadoPago.saldo} Terras</strong>
              ) : (
                <span className="text-gray-400">no disponible en este momento</span>
              )}
            </p>

            {estadoPago.saldo_disponible && !estadoPago.alcanza && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                No tienes Terras suficientes para pagar tu tarjeta. Consigue más Terras en Banexa.
              </p>
            )}

            {estadoPago.alcanza && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Clave privada de Terras
                </label>
                <input
                  type="password"
                  value={clavePrivada}
                  onChange={(e) => setClavePrivada(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            )}

            {sinClave && (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <p>Para pagar con Terras necesitas tu clave privada de Banexa.</p>
                {sinClave.url && (
                  <a
                    href={sinClave.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white transition hover:bg-amber-700"
                  >
                    Crear mi clave en Banexa
                  </a>
                )}
                <p className="mt-2 text-xs text-amber-700">Cuando la hayas creado, vuelve acá y reintenta el pago.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              {estadoPago.alcanza && (
                <button
                  type="submit"
                  disabled={pagando || !clavePrivada}
                  className="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {pagando ? 'Pagando...' : `Pagar ${estadoPago.precio} Terras`}
                </button>
              )}
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {!esPro && !cargando && !exito && !estadoPago && (
          <p className="text-sm text-red-600">{error || 'No se pudo cargar la información de pago.'}</p>
        )}

        {esPro && (
          <div>
            <p className="mb-3 text-sm text-gray-600">Elige cuánto tiempo quieres publicar tu landing.</p>

            {planesCargando && <p className="text-sm text-gray-500">Cargando planes...</p>}
            {!planesCargando && planes.length === 0 && (
              <p className="text-sm text-red-600">{planesError || 'No hay planes disponibles por ahora.'}</p>
            )}

            {planes.length > 0 && (
              <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-2">
                {planes.map((p) => {
                  const esFundador = p.id === 'fundador'
                  const elegido = p.id === planElegido
                  const gratis = mesesGratis(p, planes)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => setPlanElegido(p.id)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition ${
                        elegido ? 'border-teal-600 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${esFundador && !elegido ? 'border-amber-300 bg-amber-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">{p.nombre}</span>
                        {esFundador && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">Fundador</span>
                        )}
                        {p.id === 'anual' && (
                          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-medium text-white">Más conveniente</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-800">
                        <strong>{formatearCLP(p.monto)}</strong>
                        {p.meses > 1 && ` por ${p.meses} meses`}
                        {p.meses > 1 && ` · equivale a ${formatearCLP(Math.round(p.monto / p.meses))} al mes`}
                        {p.meses === 1 && ' al mes'}
                      </p>
                      {p.ahorro > 0 && (
                        <p className="mt-0.5 text-xs font-medium text-teal-700">
                          Ahorras {formatearCLP(p.ahorro)}
                          {gratis ? ` · ${gratis} meses gratis` : ''}
                        </p>
                      )}
                      {esFundador && p.cupos_restantes != null && (
                        <p className="mt-0.5 text-xs text-amber-800">Quedan {p.cupos_restantes}{cuposTotal != null ? ` de ${cuposTotal}` : ''} cupos</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {fundadorPrecioHasta && planes.some((p) => p.tarifa === 'fundador') && (
              <p className="mt-2 text-xs text-gray-600">Precio fundador hasta {formatearFechaCorta(fundadorPrecioHasta)}</p>
            )}

            {planActual && (
              <button
                type="button"
                onClick={onPagarMP}
                disabled={mpCargando}
                className="mt-4 w-full rounded-md px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#009ee3' }}
              >
                {mpCargando ? 'Redirigiendo a Mercado Pago...' : `Pagar ${formatearCLP(planActual.monto)}`}
              </button>
            )}
            {mpError && <p className="mt-2 text-xs text-red-600">{mpError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
