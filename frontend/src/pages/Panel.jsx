import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { borrarTarjeta, crearLandingPro, crearTarjeta, obtenerLandingPro, obtenerMisTarjetas } from '../api/tarjetas'
import { PLANTILLA_LABEL, descripcionEstado } from '../constants/tarjetas'
import { useAuth } from '../context/AuthContext'
import PromosEcosistema from '../components/PromosEcosistema'

// dd-mm-aaaa en hora local
function formatearFechaCorta(fechaIso) {
  if (!fechaIso) return ''
  const d = new Date(fechaIso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

export default function Panel() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tarjetas, setTarjetas] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [borrandoId, setBorrandoId] = useState(null)
  // undefined = cargando, null = el usuario no tiene landing Pro todavía
  const [landing, setLanding] = useState(undefined)
  const [creandoLanding, setCreandoLanding] = useState(false)
  const [errorLanding, setErrorLanding] = useState('')
  const [borrandoLanding, setBorrandoLanding] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerMisTarjetas().then(({ datos }) => {
      if (!activo) return
      setTarjetas(Array.isArray(datos) ? datos : [])
    })
    obtenerLandingPro().then(({ datos }) => {
      if (!activo) return
      setLanding(datos?.landing_pro ?? null)
    })
    return () => {
      activo = false
    }
  }, [])

  async function onCrear() {
    if (creando) return
    setError('')
    setCreando(true)
    const { datos, status } = await crearTarjeta()
    setCreando(false)
    if ((status === 201 || status === 200) && datos?.id) {
      navigate(`/panel/tarjeta/${datos.id}`)
    } else {
      setError(datos?.error || 'No se pudo crear la tarjeta.')
    }
  }

  async function onCrearLanding() {
    if (creandoLanding) return
    setErrorLanding('')
    setCreandoLanding(true)
    const { datos, status } = await crearLandingPro()
    if ((status === 201 || status === 200) && datos?.id) {
      navigate(`/panel/tarjeta/${datos.id}`)
    } else {
      setCreandoLanding(false)
      setErrorLanding(datos?.error || 'No se pudo crear la landing.')
    }
  }

  async function onEliminar(t) {
    const activa = t.estado === 'activa'
    const aviso = activa
      ? `"${t.nombre_mostrado || t.slug}" está ACTIVA y pagada. Si la eliminas perderás su suscripción. Esta acción no se puede deshacer. ¿Eliminar de todas formas?`
      : `¿Eliminar "${t.nombre_mostrado || t.slug}"? Se borrará junto con sus productos, noticias, testimonios y preguntas. Esta acción no se puede deshacer.`
    if (!window.confirm(aviso)) return
    setBorrandoId(t.id)
    const { status } = await borrarTarjeta(t.id)
    setBorrandoId(null)
    if (status === 204) {
      setTarjetas((prev) => prev.filter((x) => x.id !== t.id))
    } else {
      alert('No se pudo eliminar la tarjeta.')
    }
  }

  async function onEliminarLanding() {
    if (borrandoLanding) return
    if (
      !window.confirm(
        '¿Eliminar tu landing? Se borrará todo su contenido (productos, noticias, testimonios y preguntas). Esta acción no se puede deshacer.'
      )
    )
      return
    setErrorLanding('')
    setBorrandoLanding(true)
    const { status } = await borrarTarjeta(landing.id)
    setBorrandoLanding(false)
    if (status === 204) {
      setLanding(null)
    } else if (status === 409) {
      setErrorLanding('Esta landing tiene pagos registrados y no se puede eliminar.')
    } else {
      setErrorLanding('No se pudo eliminar la landing.')
    }
  }

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const nombre = user?.nombre_preferido || user?.nombre_completo?.trim() || user?.username
  const cargando = tarjetas === null
  const basicas = (tarjetas || []).filter((t) => t.plan !== 'kabymur_pro')

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

        <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Mi Landing Profesional
          </h2>

          {landing === undefined && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            </div>
          )}

          {landing === null && (
            <div className="mt-3">
              <p className="text-lg font-semibold text-gray-900">Crea tu Landing Profesional</p>
              <p className="mt-1 text-sm text-gray-600">
                Ármala gratis. Solo pagas cuando quieras publicarla.
              </p>
              {errorLanding && <p className="mt-3 text-sm text-red-600">{errorLanding}</p>}
              <button
                type="button"
                onClick={onCrearLanding}
                disabled={creandoLanding}
                className="mt-4 w-full rounded-md bg-teal-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {creandoLanding ? 'Creando...' : 'Crear mi landing'}
              </button>
            </div>
          )}

          {landing && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">
                  {landing.nombre_mostrado || 'Landing sin nombre'}
                </p>
                {landing.estado === 'borrador' && (
                  <p className="text-xs text-gray-600">Borrador · solo tú puedes verla</p>
                )}
                {landing.estado === 'activa' && (
                  <>
                    <p className="text-xs font-medium text-teal-700">Publicada</p>
                    {landing.fecha_vencimiento && (
                      <p className="text-xs text-gray-600">
                        Vigente hasta {formatearFechaCorta(landing.fecha_vencimiento)}
                      </p>
                    )}
                  </>
                )}
                {landing.estado !== 'borrador' && landing.estado !== 'activa' && (
                  <p className="text-xs text-gray-600">{landing.estado}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/panel/tarjeta/${landing.id}`)}
                  className="rounded-md border border-teal-300 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
                >
                  Editar
                </button>
                {(landing.estado === 'borrador' || landing.estado === 'activa') && (
                  <a
                    href={`/t/${landing.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-700"
                  >
                    {landing.estado === 'activa' ? 'Ver landing' : 'Vista previa'}
                  </a>
                )}
                {landing.estado === 'borrador' && (
                  <button
                    type="button"
                    onClick={onEliminarLanding}
                    disabled={borrandoLanding}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                  >
                    {borrandoLanding ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}
              </div>
            </div>
          )}
          {landing && errorLanding && <p className="mt-3 text-sm text-red-600">{errorLanding}</p>}
        </section>

        <h2 className="-mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Mis Tarjetas</h2>

        {cargando && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
          </div>
        )}

        {!cargando && basicas.length === 0 && (
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

        {!cargando && basicas.length > 0 && (
          <div className="flex flex-col gap-3">
            {basicas.map((t) => (
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
                <div className="ml-3 flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/panel/tarjeta/${t.id}`)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(t)}
                    disabled={borrandoId === t.id}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                  >
                    {borrandoId === t.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {basicas.length < 3 && (
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

        <PromosEcosistema />
      </div>
    </div>
  )
}
