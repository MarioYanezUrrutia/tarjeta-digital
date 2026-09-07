import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPlantilla } from '../plantillas'

export default function TarjetaPublica() {
  const { slug } = useParams()
  const [estado, setEstado] = useState('cargando')
  const [tarjeta, setTarjeta] = useState(null)

  useEffect(() => {
    setEstado('cargando')
    fetch(`${import.meta.env.VITE_API_BASE}/t/${slug}/`)
      .then(async (r) => {
        if (r.status === 404) {
          throw new Error('not_found')
        }
        return r.json()
      })
      .then((data) => {
        if (!data.disponible) {
          setEstado('no_disponible')
          return
        }
        setTarjeta(data)
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

  if (estado === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#16181f] px-6 text-center">
        <p className="text-gray-300">Esta tarjeta no existe.</p>
      </div>
    )
  }

  const Plantilla = getPlantilla(tarjeta.plantilla)
  return <Plantilla tarjeta={tarjeta} />
}
