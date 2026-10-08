import React from 'react'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, sinProtocolo, waLink } from './tanda1Comun'

// Resalta la última palabra del nombre con el acento.
function NombreConAcento({ nombre }) {
  const palabras = (nombre || '').trim().split(/\s+/)
  if (palabras.length < 2) return <>{nombre}</>
  const ultima = palabras.pop()
  return <>{palabras.join(' ')} <span className="accent">{ultima}</span></>
}

/** Vacío (moderna oscura): tipografía enorme, etiquetas mono numeradas y
 * grilla de trabajos con líneas finas. El producto no tiene año en el
 * modelo, así que cada ítem muestra su número de orden. */
export default function PlantillaVacio({ tarjeta }) {
  const {
    nombre_mostrado, cargo_rubro, eslogan, sobre_texto, whatsapp, email_contacto, instagram, linkedin, sitio_web,
    tipo, mostrar_sobre, mostrar_productos, mostrar_contacto, mostrar_redes,
  } = tarjeta
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const wa = waLink(whatsapp)
  const correo = mostrar_contacto ? email_contacto : ''
  const web = mostrar_contacto ? sitio_web : ''
  const redes = mostrar_redes ? [
    instagram && { href: instagram, label: 'Instagram' },
    linkedin && { href: linkedin, label: 'LinkedIn' },
  ].filter(Boolean) : []
  const haySobre = Boolean(mostrar_sobre && sobre_texto)
  const hayContacto = Boolean(correo || wa || web || redes.length > 0)
  let n = 0
  const siguiente = () => String(++n).padStart(2, '0')
  const numSobre = haySobre ? siguiente() : null
  const numProductos = productos.length > 0 ? siguiente() : null
  const numContacto = hayContacto ? siguiente() : null

  return (
    <div className="vacio pro-t1">
      <section className="hero">
        {cargo_rubro && (
          <div className="nav-top"><span className="tag">{cargo_rubro}</span></div>
        )}
        <h1><NombreConAcento nombre={nombre_mostrado} /></h1>
        {eslogan && <p className="lead">{eslogan}</p>}
      </section>

      {haySobre && (
        <section className="section" id="sobre">
          <span className="lbl">{numSobre} · {tipo === 'negocio' ? 'Nosotros' : 'Sobre mí'}</span>
          <p className="about-text">{sobre_texto}</p>
        </section>
      )}

      {productos.length > 0 && (
        <section className="section" id="servicios">
          <span className="lbl">{numProductos} · Trabajo seleccionado</span>
          <div className="work">
            {productos.map((p, i) => (
              <div className="work-item" key={p.orden + p.nombre}>
                <div className="meta">
                  <span>{tipo === 'negocio' ? 'Servicio' : 'Trabajo'}</span>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div>
                  <h3>{p.nombre}</h3>
                  {p.caracteristicas && <p>{p.caracteristicas}</p>}
                  {p.detalle && <p>{p.detalle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      {hayContacto && (
        <section className="cta-section" id="contacto">
          <span className="lbl" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.18em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {numContacto} · Contacto
          </span>
          <h2>Hablemos<span className="accent">.</span></h2>
          {correo && <a href={`mailto:${correo}`} className="mail mono">{correo} ↗</a>}
          {!correo && wa && <a href={wa} target="_blank" rel="noreferrer" className="mail mono">WhatsApp ↗</a>}
          {(redes.length > 0 || web) && (
            <div className="redes">
              {redes.map((r) => <a key={r.label} href={r.href} target="_blank" rel="noreferrer">{r.label} ↗</a>)}
              {web && <a href={web} target="_blank" rel="noreferrer">{sinProtocolo(web)} ↗</a>}
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <FirmaKabymur />
      </footer>
    </div>
  )
}
