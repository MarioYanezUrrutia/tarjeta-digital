import React from 'react'
import { IconMap, IconPin } from '../icons'
import { useDatosTarjeta } from '../useDatosTarjeta'
import './compartidos.css'

// Piezas comunes de la landing Pro: las usan PlantillaProBase (las 6 pieles
// originales) y las 12 plantillas de las tandas 1 a 3. Cambia solo la
// apariencia (colores y tipografías por plantilla: ver compartidos.css).

export function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.1 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z"/>
    </svg>
  )
}

export const hrefWhatsApp = (whatsapp) => (whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : null)

/** Estado y envío del formulario de contacto (POST /t/<slug>/contacto/). */
export function useFormularioContacto(tarjeta) {
  const [form, setForm] = React.useState({ nombre: '', email: '', mensaje: '', website: '' })
  const [envio, setEnvio] = React.useState({ estado: 'idle', error: '' })
  // estado: 'idle' | 'enviando' | 'ok' | 'error'

  const enviarContacto = async () => {
    if (!form.nombre.trim() || !form.mensaje.trim()) {
      setEnvio({ estado: 'error', error: 'Escribe tu nombre y un mensaje.' })
      return
    }
    setEnvio({ estado: 'enviando', error: '' })
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE}/t/${tarjeta.slug}/contacto/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          mensaje: form.mensaje,
          website: form.website, // honeypot
        }),
      })
      const datos = await resp.json().catch(() => ({}))
      if (resp.ok && datos.ok) {
        setEnvio({ estado: 'ok', error: '' })
        setForm({ nombre: '', email: '', mensaje: '', website: '' })
      } else if (resp.status === 429) {
        setEnvio({ estado: 'error', error: 'Demasiados envíos. Intenta más tarde.' })
      } else {
        setEnvio({ estado: 'error', error: datos.error || 'No se pudo enviar el mensaje.' })
      }
    } catch {
      setEnvio({ estado: 'error', error: 'No se pudo enviar el mensaje.' })
    }
  }

  return { form, setForm, envio, enviarContacto }
}

/** Botón flotante verde de WhatsApp (abajo a la derecha, 56×56). */
export function BotonWhatsAppFlotante({ href }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label="WhatsApp"
       className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
       style={{ backgroundColor: '#25D366' }}>
      <IconWhatsApp className="h-7 w-7" />
    </a>
  )
}

/** Bloque "Contacto" de las plantillas nuevas: contactos y redes, ubicación
 * con "Cómo llegar" y formulario. Mismos datos, flags y textos que la sección
 * Contacto de PlantillaProBase. */
export function ContactoPro({ tarjeta }) {
  const { direccion, horario } = tarjeta
  const { contactos, redes, mostrarUbicacionSeccion } = useDatosTarjeta(tarjeta)
  const { form, setForm, envio, enviarContacto } = useFormularioContacto(tarjeta)
  const hayLista = contactos.length > 0 || redes.length > 0
  if (!hayLista && !mostrarUbicacionSeccion && !tarjeta.email_contacto) return null

  return (
    <section className="cpro" id="contacto" data-cp={tarjeta.plantilla}>
      <div className="cpro-in">
        <h2>Contacto</h2>
        <div className="cpro-grid">
          {hayLista && (
            <div className="cpro-lista">
              {contactos.map((c) => (
                <a key={c.key} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="cpro-item">
                  <span className="cpro-ico"><c.Icon /></span>
                  <span className="cpro-txt">
                    <b>{c.label}</b>
                    {c.valor && <small>{c.valor}</small>}
                  </span>
                </a>
              ))}
              {redes.map((r) => (
                <a key={r.key} href={r.href} target="_blank" rel="noreferrer" className="cpro-item">
                  <span className="cpro-ico"><r.Icon /></span>
                  <span className="cpro-txt"><b>{r.label}</b></span>
                </a>
              ))}
            </div>
          )}
          {mostrarUbicacionSeccion && (
            <div className="cpro-card">
              <h3><IconPin /> Ubicación</h3>
              {direccion && <p>{direccion}</p>}
              {horario && <p className="cpro-muted">{horario}</p>}
              {direccion && (
                <a className="cpro-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`} target="_blank" rel="noreferrer">
                  <IconMap /> Cómo llegar
                </a>
              )}
            </div>
          )}
          {tarjeta.email_contacto && (
            <div className="cpro-card">
              <h3>Envíame un mensaje</h3>
              <div className="cpro-form">
                <input
                  type="text" tabIndex={-1} autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                  aria-hidden="true"
                />
                <input type="text" placeholder="Tu nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <input type="email" placeholder="Tu correo (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <textarea rows={4} placeholder="Tu mensaje" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
                {envio.estado === 'error' && <p className="cpro-error">{envio.error}</p>}
                {envio.estado === 'ok' && <p className="cpro-ok">¡Mensaje enviado! Te responderán pronto.</p>}
                <button type="button" className="cpro-btn" onClick={enviarContacto} disabled={envio.estado === 'enviando'}>
                  {envio.estado === 'enviando' ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const SECCIONES_MENU = [
  ['sobre', 'Sobre mí'],
  ['servicios', 'Servicios'],
  ['noticias', 'Noticias'],
  ['testimonios', 'Lo que dicen'],
  ['faq', 'Preguntas'],
  ['contacto', 'Contacto'],
]

/** Menú flotante (abajo a la izquierda): lleva a las secciones que la
 * plantilla tiene en pantalla. Lee los ids del documento al abrirse. */
export function MenuFlotante({ tarjeta }) {
  const [abierto, setAbierto] = React.useState(false)
  const [items, setItems] = React.useState([])

  // Secciones que la plantilla tiene realmente en pantalla (se leen del documento).
  React.useEffect(() => {
    const raiz = document.querySelector('.pro-t1')
    if (!raiz) return
    const hay = (id) => raiz.querySelector(`[id="${id}"]`)
    const lista = SECCIONES_MENU.filter(([id]) => hay(id)).map(([id, label]) => ({
      id, label: id === 'sobre' ? (tarjeta.tipo === 'negocio' ? 'Nosotros' : 'Sobre mí') : label,
    }))
    // Secciones propias de la plantilla (cursos, packs, planes...) antes de "Contacto".
    const propias = [...raiz.querySelectorAll('[id]')].map((n) => n.id)
      .filter((id) => /^(atenciones|carta|productos|cursos|packs|planes|pasos|preguntas|fechas)$/.test(id))
    propias.forEach((id) => lista.splice(Math.max(lista.length - 1, 0), 0, { id, label: id[0].toUpperCase() + id.slice(1) }))
    setItems(lista)
  }, [tarjeta])

  if (items.length === 0) return null

  return (
    <div className="cpro-menu" data-cp={tarjeta.plantilla}>
      {abierto && (
        <nav className="cpro-menu-panel">
          {items.map((it) => (
            <a key={it.id} href={`#${it.id}`} onClick={() => setAbierto(false)}>{it.label}</a>
          ))}
        </nav>
      )}
      <button type="button" className="cpro-menu-btn" onClick={() => setAbierto((v) => !v)} aria-label="Abrir menú" aria-expanded={abierto}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {abierto ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
    </div>
  )
}

/** Elementos fijos de las plantillas nuevas: menú flotante + WhatsApp. */
export function ExtrasPro({ tarjeta }) {
  return (
    <>
      <MenuFlotante tarjeta={tarjeta} />
      <BotonWhatsAppFlotante href={hrefWhatsApp(tarjeta.whatsapp)} />
    </>
  )
}
