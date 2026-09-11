import React, { useEffect } from 'react'
import { IconPin, IconUser, IconMap, IconContactCard } from './icons'
import { descargarVCard, iniciales, useDatosTarjeta } from './useDatosTarjeta'

const ACCENT = '#0d9488'
const ACCENT_SOFT = 'rgba(13,148,136,0.10)'

function IconWhatsApp({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.1 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.3A10 10 0 1012 2z"/>
    </svg>
  )
}

function Estrellas({ n }) {
  const total = 5
  const llenas = Math.max(0, Math.min(total, n || 0))
  return (
    <span aria-label={`${llenas} de 5`} style={{ color: ACCENT }} className="text-sm">
      {'★'.repeat(llenas)}<span className="text-gray-300">{'★'.repeat(total - llenas)}</span>
    </span>
  )
}

export default function PlantillaPro({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, profesion, empresa, eslogan,
    sobre_texto, direccion, horario, whatsapp, tipo,
    mostrar_sobre, mostrar_noticias, mostrar_testimonios, mostrar_faq,
    noticias = [], testimonios = [], faqs = [],
  } = tarjeta

  const { contactos, redes, mostrarUbicacionSeccion, mostrarProductosSeccion } = useDatosTarjeta(tarjeta)
  const productos = tarjeta.productos || []

  const [form, setForm] = React.useState({ nombre: '', email: '', mensaje: '', website: '' })
  const [envio, setEnvio] = React.useState({ estado: 'idle', error: '' })
  // estado: 'idle' | 'enviando' | 'ok' | 'error'
  const [menuAbierto, setMenuAbierto] = React.useState(false)

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

  const hayNoticias = mostrar_noticias && noticias.length > 0
  const hayTestimonios = mostrar_testimonios && testimonios.length > 0
  const hayFaq = mostrar_faq && faqs.length > 0

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = prev }
  }, [])

  const nav = [
    mostrar_sobre && sobre_texto && { id: 'sobre', label: tipo === 'negocio' ? 'Nosotros' : 'Sobre mí' },
    mostrarProductosSeccion && { id: 'servicios', label: 'Servicios' },
    hayNoticias && { id: 'noticias', label: 'Noticias' },
    { id: 'contacto', label: 'Contacto' },
  ].filter(Boolean)

  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : null

  return (
    <div className="min-h-screen bg-white text-[#1a1d21]" style={{ fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif" }}>

      <nav className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <span className="truncate text-sm font-semibold">{nombre_mostrado}</span>
          <div className="flex items-center gap-5">
            <div className="hidden gap-5 sm:flex">
              {nav.map((n) => (
                <a key={n.id} href={`#${n.id}`} className="text-sm text-gray-500 transition hover:text-[#1a1d21]">{n.label}</a>
              ))}
            </div>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                 className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition"
                 style={{ backgroundColor: ACCENT }}>Contáctame</a>
            )}
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-md text-gray-600"
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                {menuAbierto
                  ? <path d="M6 6l12 12M6 18L18 6" />
                  : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuAbierto && (
          <div className="sm:hidden border-b border-black/5 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-col px-5 py-2">
              {nav.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  onClick={() => setMenuAbierto(false)}
                  className="py-2 text-sm text-gray-600 transition hover:text-[#1a1d21]"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      <header className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${ACCENT_SOFT} 0%, rgba(255,255,255,0) 55%)` }} />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 py-16 text-center">
          {imagen ? (
            <img src={imagen} alt={nombre_mostrado || ''} className="h-36 w-36 rounded-full object-cover shadow-md ring-4 ring-white" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full text-4xl font-semibold text-white shadow-md" style={{ backgroundColor: ACCENT }}>
              {iniciales(nombre_mostrado)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{nombre_mostrado}</h1>
            {(profesion || cargo_rubro || empresa) && (
              <p className="mt-2 text-base text-gray-500">{[profesion, cargo_rubro, empresa].filter(Boolean).join(' · ')}</p>
            )}
            {eslogan && <p className="mt-3 text-lg italic text-gray-400">{eslogan}</p>}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition"
                 style={{ backgroundColor: ACCENT }}>
                <IconWhatsApp className="h-5 w-5" /> Escríbeme por WhatsApp
              </a>
            )}
            <button type="button" onClick={() => descargarVCard(tarjeta)}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-[#1a1d21] transition hover:bg-gray-50">
              <IconContactCard /> Guardar contacto
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-20 px-5 py-16">

        {mostrar_sobre && sobre_texto && (
          <section id="sobre" className="scroll-mt-20">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
              <IconUser /> Sobre {tipo === 'negocio' ? 'nosotros' : 'mí'}
            </h2>
            <p className="max-w-3xl text-lg leading-relaxed text-gray-600">{sobre_texto}</p>
          </section>
        )}

        {mostrarProductosSeccion && (
          <section id="servicios" className="scroll-mt-20">
            <h2 className="mb-6 text-2xl font-semibold">Servicios y productos</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((p) => (
                <article key={p.orden + p.nombre} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full" style={{ backgroundColor: ACCENT_SOFT }} />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold">{p.nombre}</h3>
                    {p.caracteristicas && <p className="mt-1 text-sm text-gray-500">{p.caracteristicas}</p>}
                    {p.detalle && <p className="mt-2 text-sm text-gray-600">{p.detalle}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {hayNoticias && (
          <section id="noticias" className="scroll-mt-20">
            <h2 className="mb-6 text-2xl font-semibold">Noticias y novedades</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {noticias.map((n, i) => (
                <article key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg">
                  {n.imagen ? (
                    <img src={n.imagen} alt={n.titulo} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 w-full" style={{ backgroundColor: ACCENT_SOFT }} />
                  )}
                  <div className="p-5">
                    {n.fecha && <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{n.fecha}</p>}
                    <h3 className="font-semibold">{n.titulo}</h3>
                    {n.resumen && <p className="mt-1 text-sm text-gray-500">{n.resumen}</p>}
                    {n.enlace && (
                      <a href={n.enlace} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium" style={{ color: ACCENT }}>Ver más →</a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {hayTestimonios && (
          <section id="testimonios" className="scroll-mt-20">
            <h2 className="mb-6 text-2xl font-semibold">Lo que dicen</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {testimonios.map((t, i) => (
                <figure key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {t.calificacion ? <Estrellas n={t.calificacion} /> : null}
                  <blockquote className="mt-3 text-gray-700">“{t.texto}”</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.autor} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>{iniciales(t.autor)}</span>
                    )}
                    <span>
                      <span className="block text-sm font-medium">{t.autor}</span>
                      {t.relacion && <span className="block text-xs text-gray-400">{t.relacion}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {hayFaq && (
          <section id="faq" className="scroll-mt-20">
            <h2 className="mb-6 text-2xl font-semibold">Preguntas frecuentes</h2>
            <div className="mx-auto max-w-3xl divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {faqs.map((f, i) => (
                <details key={i} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-medium">
                    {f.pregunta}
                    <svg className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </summary>
                  <p className="pb-4 text-sm leading-relaxed text-gray-600">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section id="contacto" className="scroll-mt-20">
          <h2 className="mb-6 text-2xl font-semibold">Contacto</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {(contactos.length > 0 || redes.length > 0) && (
              <div className="flex flex-col gap-3">
                {contactos.map((c) => (
                  <a key={c.key} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                     className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}><c.Icon /></span>
                    <span className="flex min-w-0 flex-col text-left">
                      <span className="text-sm font-medium">{c.label}</span>
                      {c.valor && <span className="truncate text-xs text-gray-400">{c.valor}</span>}
                    </span>
                  </a>
                ))}
                {redes.map((r) => (
                  <a key={r.key} href={r.href} target="_blank" rel="noreferrer"
                     className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}><r.Icon /></span>
                    <span className="text-sm font-medium">{r.label}</span>
                  </a>
                ))}
              </div>
            )}
            {mostrarUbicacionSeccion && (
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="mb-2 flex items-center gap-2 font-medium"><IconPin /> Ubicación</h3>
                {direccion && <p className="text-sm text-gray-600">{direccion}</p>}
                {horario && <p className="text-sm text-gray-400">{horario}</p>}
                {direccion && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`} target="_blank" rel="noreferrer"
                     className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white transition" style={{ backgroundColor: ACCENT }}>
                    <IconMap /> Cómo llegar
                  </a>
                )}
              </div>
            )}
            {tarjeta.email_contacto && (
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="mb-3 font-medium">Envíame un mensaje</h3>
                <div className="flex flex-col gap-3">
                  <input
                    type="text" tabIndex={-1} autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                    aria-hidden="true"
                  />
                  <input
                    type="text" placeholder="Tu nombre" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                  <input
                    type="email" placeholder="Tu correo (opcional)" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                  <textarea
                    rows={4} placeholder="Tu mensaje" value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    className="resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                  {envio.estado === 'error' && <p className="text-xs text-red-500">{envio.error}</p>}
                  {envio.estado === 'ok' && <p className="text-xs text-green-600">¡Mensaje enviado! Te responderán pronto.</p>}
                  <button
                    type="button" onClick={enviarContacto}
                    disabled={envio.estado === 'enviando'}
                    className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {envio.estado === 'enviando' ? 'Enviando...' : 'Enviar mensaje'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-10 text-center">
        <p className="font-semibold">{nombre_mostrado}</p>
        <p className="mt-1 text-sm text-gray-400">Powered by Kabymur</p>
      </footer>

      {waHref && (
        <a href={waHref} target="_blank" rel="noreferrer" aria-label="WhatsApp"
           className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
           style={{ backgroundColor: '#25D366' }}>
          <IconWhatsApp className="h-7 w-7" />
        </a>
      )}
    </div>
  )
}