import React, { useEffect, useState } from 'react'
import { actualizarFaq, borrarFaq, crearFaq, obtenerFaqs, reordenarFaqs } from '../api/faqs'

export const MAX_FAQS_POR_TARJETA = 6

const FORM_VACIO = { pregunta: '', respuesta: '' }

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

export default function GestionFaqs({ tarjetaId }) {
  const [faqs, setFaqs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formularioAbierto, setFormularioAbierto] = useState(null) // null | 'nuevo' | faq
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [reordenando, setReordenando] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerFaqs(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200 && Array.isArray(datos)) setFaqs(datos)
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

  function abrirEditar(faq) {
    setForm({
      pregunta: faq.pregunta || '',
      respuesta: faq.respuesta || '',
    })
    setErrorGuardar(null)
    setFormularioAbierto(faq)
  }

  async function onGuardar() {
    if (!form.pregunta.trim() || !form.respuesta.trim()) {
      setErrorGuardar('La pregunta y la respuesta son obligatorias.')
      return
    }
    setErrorGuardar(null)
    setGuardando(true)
    const esEdicion = formularioAbierto !== 'nuevo'
    const { status, datos } = esEdicion
      ? await actualizarFaq(formularioAbierto.id, form)
      : await crearFaq(tarjetaId, form)
    setGuardando(false)
    if (status === 200 || status === 201) {
      setFaqs((prev) =>
        esEdicion ? prev.map((f) => (f.id === datos.id ? datos : f)) : [...prev, datos],
      )
      limpiarFormulario()
    } else {
      setErrorGuardar(datos?.error || 'No se pudo guardar la pregunta.')
    }
  }

  async function onBorrar(faq) {
    if (!window.confirm(`¿Borrar "${faq.pregunta}"? Esta acción no se puede deshacer.`)) return
    const { status } = await borrarFaq(faq.id)
    if (status === 204) {
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id))
    }
  }

  async function onMover(indice, direccion) {
    const destino = indice + direccion
    if (destino < 0 || destino >= faqs.length || reordenando) return
    const anterior = faqs
    const nuevaLista = [...faqs]
    ;[nuevaLista[indice], nuevaLista[destino]] = [nuevaLista[destino], nuevaLista[indice]]
    setFaqs(nuevaLista)
    setReordenando(true)
    const { status, datos } = await reordenarFaqs(tarjetaId, nuevaLista.map((f) => f.id))
    setReordenando(false)
    setFaqs(status === 200 && Array.isArray(datos) ? datos : anterior)
  }

  const limiteAlcanzado = faqs.length >= MAX_FAQS_POR_TARJETA

  if (cargando) {
    return <p className="text-sm text-gray-400">Cargando preguntas...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {faqs.length} de {MAX_FAQS_POR_TARJETA} preguntas
        </p>
        {!formularioAbierto && (
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={limiteAlcanzado}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar pregunta
          </button>
        )}
      </div>

      {limiteAlcanzado && !formularioAbierto && (
        <p className="text-xs text-gray-400">Llegaste al máximo de preguntas permitidas.</p>
      )}

      {faqs.length === 0 && !formularioAbierto && (
        <p className="text-sm text-gray-400">Todavía no agregaste preguntas.</p>
      )}

      <div className="flex flex-col gap-3">
        {faqs.map((faq, indice) => (
          <div key={faq.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{faq.pregunta}</p>
              {faq.respuesta && <p className="truncate text-xs text-gray-500">{faq.respuesta}</p>}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <BotonIcono onClick={() => onMover(indice, -1)} disabled={indice === 0 || reordenando} ariaLabel="Subir">
                <IconSubir />
              </BotonIcono>
              <BotonIcono
                onClick={() => onMover(indice, 1)}
                disabled={indice === faqs.length - 1 || reordenando}
                ariaLabel="Bajar"
              >
                <IconBajar />
              </BotonIcono>
              <BotonIcono onClick={() => abrirEditar(faq)} ariaLabel="Editar pregunta">
                <IconEditar />
              </BotonIcono>
              <BotonIcono onClick={() => onBorrar(faq)} ariaLabel="Borrar pregunta" tono="peligro">
                <IconBorrar />
              </BotonIcono>
            </div>
          </div>
        ))}
      </div>

      {formularioAbierto && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            {formularioAbierto === 'nuevo' ? 'Nueva pregunta' : 'Editar pregunta'}
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pregunta</label>
            <input
              value={form.pregunta}
              onChange={(e) => setForm((prev) => ({ ...prev, pregunta: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Respuesta</label>
            <textarea
              value={form.respuesta}
              onChange={(e) => setForm((prev) => ({ ...prev, respuesta: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          {errorGuardar && <p className="text-sm text-red-600">{errorGuardar}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar pregunta'}
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
