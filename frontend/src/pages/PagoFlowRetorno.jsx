import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export default function PagoFlowRetorno() {
  const [params] = useSearchParams()
  const order = params.get('order') || ''
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <div className="max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="text-lg font-semibold text-gray-900">Estamos confirmando tu pago</h1>
        <p className="mt-3 text-sm text-gray-600">
          Recibimos tu regreso desde Flow. La confirmación del pago puede
          tardar unos segundos en reflejarse. Revisa el estado de tu tarjeta
          en tu panel; si aparece como activa, ¡todo listo!
        </p>
        {order && <p className="mt-2 text-xs text-gray-400">Orden: {order}</p>}
        <Link to="/panel" className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800">
          Ir a mi panel
        </Link>
      </div>
    </div>
  )
}
