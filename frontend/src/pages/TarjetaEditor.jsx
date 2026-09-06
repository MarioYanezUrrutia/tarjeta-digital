import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { actualizarTarjeta, obtenerTarjeta } from '../api/tarjetas'
import { PLANTILLAS_DISPONIBLES } from '../constants/tarjetas'
import MiniPreviewPlantilla from '../plantillas/MiniPreviewPlantilla'
import { iniciales } from '../plantillas/useDatosTarjeta'

const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024

const CAMPOS_TEXTO_IDENTIDAD = [
  { campo: 'nombre_mostrado', label: 'Nombre a mostrar' },
  { campo: 'cargo_rubro', label: 'Cargo o rubro' },
  { campo: 'profesion', label: 'Profesión' },
  { campo: 'empresa', label: 'Empresa' },
  { campo: 'eslogan', label: 'Eslogan' },
]

const CAMPOS_CONTACTO = [
  { campo: 'telefono', label: 'Teléfono' },
  { campo: 'whatsapp', label: 'WhatsApp' },
  { campo: 'email_contacto', label: 'Correo de contacto' },
  { campo: 'sitio_web', label: 'Sitio web' },
]

const CAMPOS_REDES = [
  { campo: 'instagram', label: 'Instagram' },
  { campo: 'facebook', label: 'Facebook' },
  { campo: 'linkedin', label: 'LinkedIn' },
  { campo: 'tiktok', label: 'TikTok' },
  { campo: 'youtube', label: 'YouTube' },
  { campo: 'x_twitter', label: 'X (Twitter)' },
]

const VALORES_INICIALES = {
  nombre_mostrado: '', cargo_rubro: '', profesion: '', empresa: '', eslogan: '', tipo: 'persona',
  telefono: '', whatsapp: '', email_contacto: '', sitio_web: '',
  instagram: '', facebook: '', linkedin: '', tiktok: '', youtube: '', x_twitter: '',
  sobre_texto: '', direccion: '', horario: '',
  mostrar_contacto: true, mostrar_redes: true, mostrar_sobre: true,
  mostrar_ubicacion: true, mostrar_productos: true,
  plantilla: 'C',
}

const CAMPOS_A_GUARDAR = Object.keys(VALORES_INICIALES)

function construirFormData(campos, archivoImagen) {
  const formData = new FormData()
  CAMPOS_A_GUARDAR.forEach((campo) => {
    const valor = campos[campo]
    formData.append(campo, valor === null || valor === undefined ? '' : valor)
  })
  formData.append('imagen', archivoImagen)
  return formData
}

function Campo({ label, value, onChange, placeholder, textarea = false }) {
  const Componente = textarea ? 'textarea' : 'input'
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <Componente
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 4 : undefined}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
    </div>
  )
}

function Interruptor({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function Seccion({ titulo, extra, children }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{titulo}</h2>
        {extra}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

export default function TarjetaEditor() {
  const { id } = useParams()
  const [campos, setCampos] = useState(VALORES_INICIALES)
  const [slug, setSlug] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [imagenUrl, setImagenUrl] = useState(null)
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [errorImagen, setErrorImagen] = useState(null)

  useEffect(() => {
    let activo = true
    obtenerTarjeta(id).then(({ status, datos }) => {
      if (!activo) return
      if (status !== 200 || !datos) {
        setNoEncontrada(true)
        setCargando(false)
        return
      }
      setSlug(datos.slug)
      setImagenUrl(datos.imagen || null)
      setCampos((prev) => ({
        ...prev,
        ...Object.fromEntries(CAMPOS_A_GUARDAR.map((c) => [c, datos[c] ?? prev[c]])),
      }))
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [id])

  function actualizar(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  function onElegirImagen(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = '' // permite volver a elegir el mismo archivo despues
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
    setMensaje(null)
    setGuardando(true)
    const { status, datos } = imagenArchivo
      ? await actualizarTarjeta(id, construirFormData(campos, imagenArchivo))
      : await actualizarTarjeta(id, Object.fromEntries(CAMPOS_A_GUARDAR.map((c) => [c, campos[c]])))
    setGuardando(false)
    if (status === 200) {
      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' })
      if (datos?.slug) setSlug(datos.slug)
      if (datos?.imagen !== undefined) setImagenUrl(datos.imagen)
      if (imagenPreview) URL.revokeObjectURL(imagenPreview)
      setImagenPreview(null)
      setImagenArchivo(null)
    } else {
      setMensaje({ tipo: 'error', texto: datos?.error || 'No se pudo guardar.' })
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
      </div>
    )
  }

  if (noEncontrada) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-gray-700">Esta tarjeta no existe o no te pertenece.</p>
        <Link to="/panel" className="font-medium text-gray-900 underline">
          Volver al panel
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link to="/panel" className="text-sm text-gray-500 hover:underline">
            ← Volver al panel
          </Link>
          {slug && (
            <a
              href={`/t/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-900 underline"
            >
              Ver mi tarjeta pública
            </a>
          )}
        </header>

        <Seccion titulo="Identidad">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={campos.tipo}
              onChange={(e) => actualizar('tipo', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="persona">Persona</option>
              <option value="negocio">Negocio</option>
            </select>
          </div>
          {CAMPOS_TEXTO_IDENTIDAD.map(({ campo, label }) => (
            <Campo key={campo} label={label} value={campos[campo]} onChange={(v) => actualizar(campo, v)} />
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {campos.tipo === 'negocio' ? 'Logo' : 'Foto de perfil'}
            </label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 text-lg font-medium text-gray-500">
                {imagenPreview || imagenUrl ? (
                  <img src={imagenPreview || imagenUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  iniciales(campos.nombre_mostrado)
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                  {campos.tipo === 'negocio' ? 'Elegir logo' : 'Elegir foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={onElegirImagen} />
                </label>
                {errorImagen && <p className="text-xs text-red-600">{errorImagen}</p>}
              </div>
            </div>
          </div>
        </Seccion>

        <Seccion
          titulo="Contacto"
          extra={
            <Interruptor
              label="Mostrar"
              checked={campos.mostrar_contacto}
              onChange={(v) => actualizar('mostrar_contacto', v)}
            />
          }
        >
          {CAMPOS_CONTACTO.map(({ campo, label }) => (
            <Campo key={campo} label={label} value={campos[campo]} onChange={(v) => actualizar(campo, v)} />
          ))}
        </Seccion>

        <Seccion
          titulo="Redes"
          extra={
            <Interruptor
              label="Mostrar"
              checked={campos.mostrar_redes}
              onChange={(v) => actualizar('mostrar_redes', v)}
            />
          }
        >
          {CAMPOS_REDES.map(({ campo, label }) => (
            <Campo key={campo} label={label} value={campos[campo]} onChange={(v) => actualizar(campo, v)} />
          ))}
        </Seccion>

        <Seccion
          titulo="Sobre"
          extra={
            <Interruptor
              label="Mostrar"
              checked={campos.mostrar_sobre}
              onChange={(v) => actualizar('mostrar_sobre', v)}
            />
          }
        >
          <Campo
            label="Descripción"
            value={campos.sobre_texto}
            onChange={(v) => actualizar('sobre_texto', v)}
            textarea
          />
        </Seccion>

        <Seccion
          titulo="Ubicación"
          extra={
            <Interruptor
              label="Mostrar"
              checked={campos.mostrar_ubicacion}
              onChange={(v) => actualizar('mostrar_ubicacion', v)}
            />
          }
        >
          <Campo label="Dirección" value={campos.direccion} onChange={(v) => actualizar('direccion', v)} />
          <Campo label="Horario" value={campos.horario} onChange={(v) => actualizar('horario', v)} />
        </Seccion>

        <Seccion
          titulo="Productos"
          extra={
            <Interruptor
              label="Mostrar"
              checked={campos.mostrar_productos}
              onChange={(v) => actualizar('mostrar_productos', v)}
            />
          }
        >
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-400">
            Catálogo de productos — próximamente
            {/* TODO Panel-3: gestión de productos */}
          </div>
        </Seccion>

        <Seccion titulo="Plantilla">
          <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
            {PLANTILLAS_DISPONIBLES.map((p) => {
              const seleccionada = campos.plantilla === p.valor
              return (
                <button
                  key={p.valor}
                  type="button"
                  onClick={() => actualizar('plantilla', p.valor)}
                  aria-pressed={seleccionada}
                  className={`flex flex-col items-center gap-2 rounded-xl p-2 transition ${
                    seleccionada
                      ? 'ring-2 ring-gray-900 ring-offset-2'
                      : 'ring-1 ring-transparent hover:ring-gray-200'
                  }`}
                >
                  <MiniPreviewPlantilla plantilla={p.valor} />
                  <span className={`text-xs font-medium ${seleccionada ? 'text-gray-900' : 'text-gray-500'}`}>
                    {p.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </Seccion>

        {mensaje && (
          <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {mensaje.texto}
          </p>
        )}

        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
