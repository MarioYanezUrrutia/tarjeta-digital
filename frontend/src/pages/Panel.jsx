import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearTarjeta, obtenerMisTarjetas } from '../api/tarjetas'
import { PLANTILLA_LABEL, descripcionEstado } from '../constants/tarjetas'
import { useAuth } from '../context/AuthContext'

export default function Panel() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tarjetas, setTarjetas] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    obtenerMisTarjetas().then(({ datos }) => {
      if (!activo) return
      setTarjetas(Array.isArray(datos) ? datos : [])
    })
    return () => {
      activo = false
    }
  }, [])

  async function onCrear() {
    setError('')
    setCreando(true)
    const { datos, status } = await crearTarjeta()
    setCreando(false)
    if (status === 201 && datos?.id) {
      navigate(`/panel/tarjeta/${datos.id}`)
    } else {
      setError(datos?.error || 'No se pudo crear la tarjeta.')
    }
  }

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const nombre = user?.nombre_preferido || user?.nombre_completo?.trim() || user?.username
  const cargando = tarjetas === null

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Hola, {nombre}</h1>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </header>

        {cargando && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
          </div>
        )}

        {!cargando && tarjetas.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <p className="text-gray-700">Todavía no tienes ninguna tarjeta digital.</p>
            <p className="mt-1 text-sm text-gray-500">
              Crea la primera en unos segundos y compártela con un link o un QR.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={onCrear}
              disabled={creando}
              className="mt-5 w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {creando ? 'Creando...' : 'Crear mi tarjeta'}
            </button>
          </div>
        )}

        {!cargando && tarjetas.length > 0 && (
          <div className="flex flex-col gap-3">
            {tarjetas.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-white p-4 shadow"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {t.nombre_mostrado || 'Tarjeta sin nombre'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {descripcionEstado(t.estado, t.fecha_vencimiento)} · Plantilla{' '}
                    {PLANTILLA_LABEL[t.plantilla] || t.plantilla}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/panel/tarjeta/${t.id}`)}
                  className="ml-3 shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Editar
                </button>
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {tarjetas.length < 3 && (
              <button
                type="button"
                onClick={onCrear}
                disabled={creando}
                className="rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-white disabled:opacity-50"
              >
                {creando ? 'Creando...' : '+ Crear otra tarjeta'}
              </button>
            )}
          </div>
        )}

        {/* TODO: promos del ecosistema Kabymur — se agrega después */}
      </div>
    </div>
  )
}
