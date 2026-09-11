import React, { useEffect, useState } from 'react'
import {
  actualizarNoticia,
  borrarNoticia,
  crearNoticia,
  obtenerNoticias,
  reordenarNoticias,
} from '../api/noticias'

const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024
export const MAX_NOTICIAS_POR_TARJETA = 6

const FORM_VACIO = { titulo: '', resumen: '', fecha: '', enlace: '' }

function construirFormDataNoticia(campos, archivoImagen) {
  const formData = new FormData()
  formData.append('titulo', campos.titulo ?? '')
  formData.append('resumen', campos.resumen ?? '')
  formData.append('fecha', campos.fecha ?? '')
  formData.append('enlace', campos.enlace ?? '')
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

export default function GestionNoticias({ tarjetaId }) {
  const [noticias, setNoticias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formularioAbierto, setFormularioAbierto] = useState(null) // null | 'nuevo' | noticia
  const [form, setForm] = useState(FORM_VACIO)
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [errorImagen, setErrorImagen] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState(null)
  const [reordenando, setReordenando] = useState(false)

  useEffect(() => {
    let activo = true
    obtenerNoticias(tarjetaId).then(({ status, datos }) => {
      if (!activo) return
      if (status === 200 && Array.isArray(datos)) setNoticias(datos)
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

  function abrirEditar(noticia) {
    setForm({
      titulo: noticia.titulo || '',
      resumen: noticia.resumen || '',
      fecha: noticia.fecha || '',
      enlace: noticia.enlace || '',
    })
    setImagenArchivo(null)
    setImagenPreview(null)
    setErrorImagen(null)
    setErrorGuardar(null)
    setFormularioAbierto(noticia)
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
    if (!form.titulo.trim()) {
      setErrorGuardar('El título es obligatorio.')
      return
    }
    setErrorGuardar(null)
    setGuardando(true)
    const esEdicion = formularioAbierto !== 'nuevo'
    const cuerpo = imagenArchivo ? construirFormDataNoticia(form, imagenArchivo) : form
    const { status, datos } = esEdicion
      ? await actualizarNoticia(formularioAbierto.id, cuerpo)
      : await crearNoticia(tarjetaId, cuerpo)
    setGuardando(false)
    if (status === 200 || status === 201) {
      setNoticias((prev) =>
        esEdicion ? prev.map((n) => (n.id === datos.id ? datos : n)) : [...prev, datos],
      )
      limpiarFormulario()
    } else {
      setErrorGuardar(datos?.error || 'No se pudo guardar la noticia.')
    }
  }

  async function onBorrar(noticia) {
    if (!window.confirm(`¿Borrar "${noticia.titulo}"? Esta acción no se puede deshacer.`)) return
    const { status } = await borrarNoticia(noticia.id)
    if (status === 204) {
      setNoticias((prev) => prev.filter((n) => n.id !== noticia.id))
    }
  }

  async function onMover(indice, direccion) {
    const destino = indice + direccion
    if (destino < 0 || destino >= noticias.length || reordenando) return
    const anterior = noticias
    const nuevaLista = [...noticias]
    ;[nuevaLista[indice], nuevaLista[destino]] = [nuevaLista[destino], nuevaLista[indice]]
    setNoticias(nuevaLista)
    setReordenando(true)
    const { status, datos } = await reordenarNoticias(tarjetaId, nuevaLista.map((n) => n.id))
    setReordenando(false)
    setNoticias(status === 200 && Array.isArray(datos) ? datos : anterior)
  }

  const limiteAlcanzado = noticias.length >= MAX_NOTICIAS_POR_TARJETA

  if (cargando) {
    return <p className="text-sm text-gray-400">Cargando noticias...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {noticias.length} de {MAX_NOTICIAS_POR_TARJETA} noticias
        </p>
        {!formularioAbierto && (
          <button
            type="button"
            onClick={abrirNuevo}
            disabled={limiteAlcanzado}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar noticia
          </button>
        )}
      </div>

      {limiteAlcanzado && !formularioAbierto && (
        <p className="text-xs text-gray-400">Llegaste al máximo de noticias permitidas.</p>
      )}

      {noticias.length === 0 && !formularioAbierto && (
        <p className="text-sm text-gray-400">Todavía no agregaste noticias.</p>
      )}

      <div className="flex flex-col gap-3">
        {noticias.map((noticia, indice) => (
          <div key={noticia.id} className="flex flex-col gap-3 rounded-md border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              {noticia.imagen ? (
                <img src={noticia.imagen} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <PlaceholderImagen />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{noticia.titulo}</p>
                {noticia.resumen && (
                  <p className="truncate text-xs text-gray-500">{noticia.resumen}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <BotonIcono onClick={() => onMover(indice, -1)} disabled={indice === 0 || reordenando} ariaLabel="Subir">
                <IconSubir />
              </BotonIcono>
              <BotonIcono
                onClick={() => onMover(indice, 1)}
                disabled={indice === noticias.length - 1 || reordenando}
                ariaLabel="Bajar"
              >
                <IconBajar />
              </BotonIcono>
              <BotonIcono onClick={() => abrirEditar(noticia)} ariaLabel="Editar noticia">
                <IconEditar />
              </BotonIcono>
              <BotonIcono onClick={() => onBorrar(noticia)} ariaLabel="Borrar noticia" tono="peligro">
                <IconBorrar />
              </BotonIcono>
            </div>
          </div>
        ))}
      </div>

      {formularioAbierto && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            {formularioAbierto === 'nuevo' ? 'Nueva noticia' : 'Editar noticia'}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-white text-[10px] text-gray-400">
              {imagenPreview || (formularioAbierto !== 'nuevo' && formularioAbierto.imagen) ? (
                <img
                  src={imagenPreview || formularioAbierto.imagen}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Resumen</label>
            <textarea
              value={form.resumen}
              onChange={(e) => setForm((prev) => ({ ...prev, resumen: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Enlace</label>
            <input
              type="url"
              value={form.enlace}
              onChange={(e) => setForm((prev) => ({ ...prev, enlace: e.target.value }))}
              placeholder="https://..."
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
              {guardando ? 'Guardando...' : 'Guardar noticia'}
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
