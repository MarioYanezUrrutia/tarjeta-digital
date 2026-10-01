import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verificarPagoMercadoPago } from '../api/tarjetas'

// Al volver de Mercado Pago NO se confía en nada de la URL salvo `ref`
// ('pro-<id>-<ts>'), que solo sirve para saber qué orden preguntarle al
// backend; es el backend quien consulta a MP y decide si el pago está
// aprobado.
export default function PagoMercadoPagoRetorno() {
  const [params] = useSearchParams()
  const ref = params.get('ref') || ''
  const tarjetaId = /^pro-(\d+)-\d+$/.exec(ref)?.[1]
  // { tipo: 'cargando' | 'aprobado' | 'pendiente' | 'rechazado' | 'no_encontrado' | 'sin_sesion' | 'error', slug? }
  const [res, setRes] = useState({ tipo: 'cargando' })

  const verificar = useCallback(async () => {
    if (!tarjetaId) {
      setRes({ tipo: 'error' })
      return
    }
    setRes({ tipo: 'cargando' })
    const { status, datos } = await verificarPagoMercadoPago(tarjetaId, ref)
    if (status === 401) setRes({ tipo: 'sin_sesion' })
    else if (status === 200 && datos?.resultado) setRes({ tipo: datos.resultado, slug: datos.slug })
    else setRes({ tipo: 'error' })
  }, [tarjetaId, ref])

  useEffect(() => {
    verificar()
  }, [verificar])

  const boton = 'mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800'
  const botonSecundario = 'mt-3 inline-block rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <div className="flex max-w-md flex-col items-center rounded-lg bg-white p-8 shadow">
        {res.tipo === 'cargando' && (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Confirmando tu pago...</h1>
          </>
        )}

        {res.tipo === 'aprobado' && (
          <>
            <h1 className="text-lg font-semibold text-green-700">¡Tu landing está publicada!</h1>
            <p className="mt-3 text-sm text-gray-600">Ya es pública: cualquiera con tu enlace puede verla.</p>
            {res.slug && (
              <a href={`/t/${res.slug}`} className={boton}>Ver mi landing</a>
            )}
            <Link to="/panel" className={botonSecundario}>Ir a mi panel</Link>
          </>
        )}

        {res.tipo === 'pendiente' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Tu pago está pendiente</h1>
            <p className="mt-3 text-sm text-gray-600">
              Mercado Pago aún no lo confirma. Tu landing sigue privada y se publicará sola cuando el pago se apruebe.
            </p>
            <button type="button" onClick={verificar} className={boton}>Revisar de nuevo</button>
            <Link to="/panel" className={botonSecundario}>Ir a mi panel</Link>
          </>
        )}

        {res.tipo === 'rechazado' && (
          <>
            <h1 className="text-lg font-semibold text-red-700">No se pudo completar el pago</h1>
            <p className="mt-3 text-sm text-gray-600">
              El pago fue rechazado o cancelado. No se te cobró y tu landing sigue privada. Puedes intentarlo de nuevo desde el editor.
            </p>
            <Link to="/panel" className={boton}>Ir a mi panel</Link>
          </>
        )}

        {res.tipo === 'no_encontrado' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">No encontramos tu pago</h1>
            <p className="mt-3 text-sm text-gray-600">
              Si cancelaste el pago, tu landing sigue privada. Si ya pagaste, espera unos segundos y revisa de nuevo.
            </p>
            <button type="button" onClick={verificar} className={boton}>Revisar de nuevo</button>
            <Link to="/panel" className={botonSecundario}>Ir a mi panel</Link>
          </>
        )}

        {res.tipo === 'sin_sesion' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Inicia sesión para ver tu pago</h1>
            <p className="mt-3 text-sm text-gray-600">Tu sesión expiró. Inicia sesión y vuelve a revisar el estado de tu landing.</p>
            <Link to="/login" className={boton}>Iniciar sesión</Link>
          </>
        )}

        {res.tipo === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900">No pudimos confirmar tu pago</h1>
            <p className="mt-3 text-sm text-gray-600">
              Ocurrió un problema al consultar Mercado Pago. Si pagaste, tu landing se publicará apenas se confirme.
            </p>
            <button type="button" onClick={verificar} className={boton}>Reintentar</button>
            <Link to="/panel" className={botonSecundario}>Ir a mi panel</Link>
          </>
        )}
      </div>
    </div>
  )
}
