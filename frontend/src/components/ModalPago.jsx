import React, { useEffect, useState } from 'react'
import { crearPagoFlow, obtenerEstadoPago, pagarTarjeta } from '../api/tarjetas'
import { formatearFecha } from '../constants/tarjetas'

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
  const [exito, setExito] = useState(null)
  const [flowCargando, setFlowCargando] = useState(false)
  const [flowError, setFlowError] = useState('')

  useEffect(() => {
    let activo = true
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
    setPagando(true)
    const { status, datos } = await pagarTarjeta(tarjetaId, clavePrivada)
    setPagando(false)
    setClavePrivada('') // no dejar la clave en memoria mas de lo necesario

    if (status === 200 && datos?.ok) {
      setExito(datos)
      onPagoExitoso(datos)
      setTimeout(onCerrar, 1500)
    } else {
      setError(datos?.error || 'No se pudo procesar el pago.')
    }
  }

  async function onPagarFlow() {
    setFlowError('')
    setFlowCargando(true)
    const { status, datos } = await crearPagoFlow(tarjetaId)
    if (status === 200 && datos?.ok && datos.url) {
      window.location.href = datos.url // redirige a Flow
      return
    }
    setFlowCargando(false)
    setFlowError(datos?.error || 'No se pudo iniciar el pago con Flow.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Activar tarjeta</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="text-lg leading-none text-gray-400 transition hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {cargando && <p className="text-sm text-gray-500">Consultando tu saldo de Terras...</p>}

        {!cargando && exito && (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            ¡Tu tarjeta está activa hasta {formatearFecha(exito.fecha_vencimiento)}!
          </p>
        )}

        {!cargando && !exito && estadoPago && (
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

        {!cargando && !exito && !estadoPago && (
          <p className="text-sm text-red-600">{error || 'No se pudo cargar la información de pago.'}</p>
        )}

        {esPro && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="mb-2 text-sm text-gray-600">Plan Pro — pago en dinero</p>
            <button
              type="button"
              onClick={onPagarFlow}
              disabled={flowCargando}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {flowCargando ? 'Redirigiendo a Flow...' : 'Pagar Pro con Flow'}
            </button>
            {flowError && <p className="mt-2 text-xs text-red-600">{flowError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
