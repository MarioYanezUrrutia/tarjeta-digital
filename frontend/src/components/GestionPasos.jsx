import React, { useEffect, useState } from 'react'
import { actualizarPaso, borrarPaso, crearPaso, obtenerPasos, reordenarPasos } from '../api/pasos'

export const MAX_PASOS_POR_TARJETA = 4

const FORM_VACIO = { titulo: '', texto: '' }

const ICONO_BASE = { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'currentColor' }

function IconSubir() {
  return (
    <svg {...ICONO_BASE}>
      <path d="M12 4l-8 8h5v8h6v-8h5z" />
    </svg>
  )
}

function IconBajar() {
  return (
    <svg {...ICONO_BASE}>
      <path d="M12 20l8-8h-5V4h-6v8H4z" />
    </svg>
  )
}

function IconEditar() {
  return (
    <svg {...ICONO_BASE}>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

function IconBorrar() {
  return (
    <svg {...ICONO_BASE}>
      <path d="M6 7h12l-1 13.5A1.5 1.5 0 0 1 15.5 22h-7A1.5 1.5 0 0 1 7 20.5L6 7zm3-3h6l1 2H8l1-2zM4 6h16v1.5H4V6z" />
    </svg>
  )
}

// Botones de accion como icono (en vez de texto): "Editar"/"Borrar" en texto
// junto a las flechas no entraba en el ancho de un celular angosto (~360-
// 390px) sin forzar overflow horizontal de toda la pagina — los iconos con
// aria-label mantienen la accesibilidad sin ese problema de espacio.
function BotonIcono({ onClick, disabled, ariaLabel, tono = 'neutro', children }) {
  const tonoClassName =
    tono === 'peligro'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${tonoClassName}`}
    >
      {children}
    </button>
  )
}

export default function GestionPasos({ tarjetaId }) {
  const [pasos, setPasos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formularioAbierto, setFormularioAbierto] = useState(null) // null | 'nuevo' | paso
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [reordenando, setReordenando] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerPasos(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200 && Array.isArray(datos)) setPasos(datos)
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [tarjetaId])

  function limpiarFormulario() {
    setFormularioAbierto(null)
    setForm(FORM_VACIO)
    setErrorGuardar(null)
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setErrorGuardar(null)
    setFormularioAbierto('nuevo')
  }

  function abrirEditar(paso) {
    setForm({
      titulo: paso.titulo || '',
      texto: paso.texto || '',
    })
    setErrorGuardar(null)
    setFormularioAbierto(paso)
  }

  async function onGuardar() {
    if (!form.titulo.trim() || !form.texto.trim()) {
      setErrorGuardar('El título y el texto son obligatorios.')
      return
    }
    setErrorGuardar(null)
    setGuardando(true)
    const esEdicion = formularioAbierto !== 'nuevo'
    const { status, datos } = esEdicion
      ? await actualizarPaso(formularioAbierto.id, form)
      : await crearPaso(tarjetaId, form)
    setGuardando(false)
    if (status === 200 || status === 201) {
      setPasos((prev) =>
        esEdicion ? prev.map((f) => (f.id === datos.id ? datos : f)) : [...prev, datos],
      )
      limpiarFormulario()
    } else {
      setErrorGuardar(datos?.error || 'No se pudo guardar el paso.')
    }
  }

  async function onBorrar(paso) {
    if (!window.confirm(`¿Borrar "${paso.titulo}"? Esta acción no se puede deshacer.`)) return
    const { status } = await borrarPaso(paso.id)
    if (status === 204) {
      setPasos((prev) => prev.filter((f) => f.id !== paso.id))
    }
  }

  async function onMover(indice, direccion) {
    const destino = indice + direccion
    if (destino < 0 || destino >= pasos.length || reordenando) return
    const anterior = pasos
    const nuevaLista = [...pasos]
    ;[nuevaLista[indice], nuevaLista[destino]] = [nuevaLista[destino], nuevaLista[indice]]
    setPasos(nuevaLista)
    setReordenando(true)
    const { status, datos } = await reordenarPasos(tarjetaId, nuevaLista.map((f) => f.id))
    setReordenando(false)
    setPasos(status === 200 && Array.isArray(datos) ? datos : anterior)
  }

  const limiteAlcanzado = pasos.length >= MAX_PASOS_POR_TARJETA

  if (cargando) {
    return <p className="text-sm text-gray-400">Cargando pasos...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">Hasta 4 pasos. Ej.: Evaluación, Plan, Alta.</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {pasos.length} de {MAX_PASOS_POR_TARJETA} pasos
        </p>
        {!formularioAbierto && (
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={limiteAlcanzado}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar paso
          </button>
        )}
      </div>

      {limiteAlcanzado && !formularioAbierto && (
        <p className="text-xs text-gray-400">Llegaste al máximo de pasos permitidos.</p>
      )}

      {pasos.length === 0 && !formularioAbierto && (
        <p className="text-sm text-gray-400">Todavía no agregaste pasos.</p>
      )}

      <div className="flex flex-col gap-3">
        {pasos.map((paso, indice) => (
          <div key={paso.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{paso.titulo}</p>
              {paso.texto && <p className="truncate text-xs text-gray-500">{paso.texto}</p>}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <BotonIcono onClick={() => onMover(indice, -1)} disabled={indice === 0 || reordenando} ariaLabel="Subir">
                <IconSubir />
              </BotonIcono>
              <BotonIcono
                onClick={() => onMover(indice, 1)}
                disabled={indice === pasos.length - 1 || reordenando}
                ariaLabel="Bajar"
              >
                <IconBajar />
              </BotonIcono>
              <BotonIcono onClick={() => abrirEditar(paso)} ariaLabel="Editar paso">
                <IconEditar />
              </BotonIcono>
              <BotonIcono onClick={() => onBorrar(paso)} ariaLabel="Borrar paso" tono="peligro">
                <IconBorrar />
              </BotonIcono>
            </div>
          </div>
        ))}
      </div>

      {formularioAbierto && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            {formularioAbierto === 'nuevo' ? 'Nuevo paso' : 'Editar paso'}
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
            <input
              value={form.titulo}
              maxLength={60}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Texto</label>
            <textarea
              value={form.texto}
              maxLength={200}
              onChange={(e) => setForm((prev) => ({ ...prev, texto: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <p className="text-xs text-gray-500">Título: hasta 60 caracteres. Texto: hasta 200.</p>
          {errorGuardar && <p className="text-sm text-red-600">{errorGuardar}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar paso'}
            </button>
            <button
              type="button"
              onClick={limpiarFormulario}
              disabled={guardando}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
