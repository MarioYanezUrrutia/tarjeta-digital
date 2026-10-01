import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPlantillaParaTarjeta } from '../plantillas'

export default function TarjetaPublica() {
  const { slug } = useParams()
  const [estado, setEstado] = useState('cargando')
  const [tarjeta, setTarjeta] = useState(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    setEstado('cargando')
    setPreview(false)
    fetch(`${import.meta.env.VITE_API_BASE}/t/${slug}/`, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 404) {
          const cuerpo = await r.json().catch(() => ({}))
          if (cuerpo.detail === 'no_publicada') return cuerpo
          throw new Error('not_found')
        }
        return r.json()
      })
      .then((data) => {
        if (data.detail === 'no_publicada') {
          setEstado('no_publicada')
          return
        }
        if (!data.disponible) {
          setEstado('no_disponible')
          return
        }
        setTarjeta(data)
        setPreview(data.preview === true)
        setEstado('listo')
      })
      .catch(() => setEstado('error'))
  }, [slug])

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181f]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#21242e] border-t-[#2dd4bf]" />
      </div>
    )
  }

  if (estado === 'no_disponible') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181f] px-6 text-center">
        <p className="text-gray-300">Esta tarjeta no está disponible en este momento.</p>
      </div>
    )
  }

  if (estado === 'no_publicada') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181f] px-6 text-center">
        <p className="text-gray-300">Esta landing aún no está publicada.</p>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181f] px-6 text-center">
        <p className="text-gray-300">Esta tarjeta no existe.</p>
      </div>
    )
  }

  const Plantilla = getPlantillaParaTarjeta(tarjeta)
  return (
    <>
      {preview && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-gray-900 shadow">
          Vista previa privada · Solo tú puedes ver esta landing. Publícala para que todos la vean.
        </div>
      )}
      <Plantilla tarjeta={tarjeta} />
    </>
  )
}
