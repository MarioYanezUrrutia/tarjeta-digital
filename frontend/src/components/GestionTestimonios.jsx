import React, { useEffect, useState } from 'react'
import {
  actualizarTestimonio,
  borrarTestimonio,
  crearTestimonio,
  obtenerTestimonios,
  reordenarTestimonios,
} from '../api/testimonios'

const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024
export const MAX_TESTIMONIOS_POR_TARJETA = 6

const FORM_VACIO = { autor: '', relacion: '', texto: '', calificacion: '' }

function construirFormDataTestimonio(campos, archivoImagen) {
  const formData = new FormData()
  formData.append('autor', campos.autor ?? '')
  formData.append('relacion', campos.relacion ?? '')
  formData.append('texto', campos.texto ?? '')
  formData.append('calificacion', campos.calificacion ?? '')
  if (archivoImagen) formData.append('imagen', archivoImagen)
  return formData
}

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

function PlaceholderImagen() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-[10px] text-gray-400">
      Sin foto
    </div>
  )
}

export default function GestionTestimonios({ tarjetaId }) {
  const [testimonios, setTestimonios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formularioAbierto, setFormularioAbierto] = useState(null) // null | 'nuevo' | testimonio
  const [form, setForm] = useState(FORM_VACIO)
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [errorImagen, setErrorImagen] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [reordenando, setReordenando] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerTestimonios(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200 && Array.isArray(datos)) setTestimonios(datos)
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [tarjetaId])

  function limpiarFormulario() {
    if (imagenPreview) URL.revokeObjectURL(imagenPreview)
    setFormularioAbierto(null)
    setForm(FORM_VACIO)
    setImagenArchivo(null)
    setImagenPreview(null)
    setErrorImagen(null)
    setErrorGuardar(null)
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setImagenArchivo(null)
    setImagenPreview(null)
    setErrorImagen(null)
    setErrorGuardar(null)
    setFormularioAbierto('nuevo')
  }

  function abrirEditar(testimonio) {
    setForm({
      autor: testimonio.autor || '',
      relacion: testimonio.relacion || '',
      texto: testimonio.texto || '',
      calificacion: testimonio.calificacion ?? '',
    })
    setImagenArchivo(null)
    setImagenPreview(null)
    setErrorImagen(null)
    setErrorGuardar(null)
    setFormularioAbierto(testimonio)
  }

  function onElegirImagen(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) {
      setErrorImagen('El archivo debe ser una imagen.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
      setErrorImagen('La imagen no puede superar los 5 MB.')
      return
    }
    setErrorImagen(null)
    setImagenPreview((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior)
      return URL.createObjectURL(archivo)
    })
    setImagenArchivo(archivo)
  }

  async function onGuardar() {
    if (!form.autor.trim() || !form.texto.trim()) {
      setErrorGuardar('El autor y el testimonio son obligatorios.')
      return
    }
    setErrorGuardar(null)
    setGuardando(true)
    const esEdicion = formularioAbierto !== 'nuevo'
    const cuerpo = imagenArchivo ? construirFormDataTestimonio(form, imagenArchivo) : form
    const { status, datos } = esEdicion
      ? await actualizarTestimonio(formularioAbierto.id, cuerpo)
      : await crearTestimonio(tarjetaId, cuerpo)
    setGuardando(false)
    if (status === 200 || status === 201) {
      setTestimonios((prev) =>
        esEdicion ? prev.map((t) => (t.id === datos.id ? datos : t)) : [...prev, datos],
      )
      limpiarFormulario()
    } else {
      setErrorGuardar(datos?.error || 'No se pudo guardar el testimonio.')
    }
  }

  async function onBorrar(testimonio) {
    if (!window.confirm(`¿Borrar "${testimonio.autor}"? Esta acción no se puede deshacer.`)) return
    const { status } = await borrarTestimonio(testimonio.id)
    if (status === 204) {
      setTestimonios((prev) => prev.filter((t) => t.id !== testimonio.id))
    }
  }

  async function onMover(indice, direccion) {
    const destino = indice + direccion
    if (destino < 0 || destino >= testimonios.length || reordenando) return
    const anterior = testimonios
    const nuevaLista = [...testimonios]
    ;[nuevaLista[indice], nuevaLista[destino]] = [nuevaLista[destino], nuevaLista[indice]]
    setTestimonios(nuevaLista)
    setReordenando(true)
    const { status, datos } = await reordenarTestimonios(tarjetaId, nuevaLista.map((t) => t.id))
    setReordenando(false)
    setTestimonios(status === 200 && Array.isArray(datos) ? datos : anterior)
  }

  const limiteAlcanzado = testimonios.length >= MAX_TESTIMONIOS_POR_TARJETA

  if (cargando) {
    return <p className="text-sm text-gray-400">Cargando testimonios...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {testimonios.length} de {MAX_TESTIMONIOS_POR_TARJETA} testimonios
        </p>
        {!formularioAbierto && (
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={limiteAlcanzado}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar testimonio
          </button>
        )}
      </div>

      {limiteAlcanzado && !formularioAbierto && (
        <p className="text-xs text-gray-400">Llegaste al máximo de testimonios permitidos.</p>
      )}

      {testimonios.length === 0 && !formularioAbierto && (
        <p className="text-sm text-gray-400">Todavía no agregaste testimonios.</p>
      )}

      <div className="flex flex-col gap-3">
        {testimonios.map((testimonio, indice) => (
          <div key={testimonio.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              {testimonio.avatar ? (
                <img src={testimonio.avatar} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <PlaceholderImagen />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{testimonio.autor}</p>
                {testimonio.texto && (
                  <p className="truncate text-xs text-gray-500">{testimonio.texto}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <BotonIcono onClick={() => onMover(indice, -1)} disabled={indice === 0 || reordenando} ariaLabel="Subir">
                <IconSubir />
              </BotonIcono>
              <BotonIcono
                onClick={() => onMover(indice, 1)}
                disabled={indice === testimonios.length - 1 || reordenando}
                ariaLabel="Bajar"
              >
                <IconBajar />
              </BotonIcono>
              <BotonIcono onClick={() => abrirEditar(testimonio)} ariaLabel="Editar testimonio">
                <IconEditar />
              </BotonIcono>
              <BotonIcono onClick={() => onBorrar(testimonio)} ariaLabel="Borrar testimonio" tono="peligro">
                <IconBorrar />
              </BotonIcono>
            </div>
          </div>
        ))}
      </div>

      {formularioAbierto && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            {formularioAbierto === 'nuevo' ? 'Nuevo testimonio' : 'Editar testimonio'}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-white text-[10px] text-gray-400">
              {imagenPreview || (formularioAbierto !== 'nuevo' && formularioAbierto.avatar) ? (
                <img
                  src={imagenPreview || formularioAbierto.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                'Sin foto'
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                Elegir imagen
                <input type="file" accept="image/*" className="hidden" onChange={onElegirImagen} />
              </label>
              {errorImagen && <p className="text-xs text-red-600">{errorImagen}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Autor</label>
            <input
              value={form.autor}
              onChange={(e) => setForm((prev) => ({ ...prev, autor: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Relación</label>
            <input
              value={form.relacion}
              onChange={(e) => setForm((prev) => ({ ...prev, relacion: e.target.value }))}
              placeholder='Ej: "Clienta", "Alumno"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Testimonio</label>
            <textarea
              value={form.texto}
              onChange={(e) => setForm((prev) => ({ ...prev, texto: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Calificación</label>
            <select
              value={form.calificacion}
              onChange={(e) => setForm((prev) => ({ ...prev, calificacion: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="">Sin calificación</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          {errorGuardar && <p className="text-sm text-red-600">{errorGuardar}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onGuardar}
              disabled={guardando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar testimonio'}
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
