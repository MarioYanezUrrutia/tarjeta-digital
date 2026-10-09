import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, textosProducto, sinProtocolo, waLink } from './tanda1Comun'

// El texto tras la primera coma del titular va en cursiva de acento.
function Titular({ texto }) {
  const i = texto.indexOf(',')
  if (i < 0) return <>{texto}</>
  return <>{texto.slice(0, i + 1)} <em>{texto.slice(i + 1).trim()}</em></>
}

function fechaMasthead() {
  return new Date().toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase()
}

const ROMANOS = ['§I.', '§II.', '§III.', '§IV.']

/** Revista (editorial): masthead con fecha actual, titular enorme, texto en
 * columnas con capitular, servicios numerados y cita final en negro. */
export default function PlantillaRevista({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, email_contacto, sitio_web, whatsapp,
    tipo, mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto,
  } = tarjeta
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const wa = waLink(whatsapp)
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const parrafos = (sobre_texto || '').split(/\r?\n\s*\r?\n/).map((s) => s.trim()).filter(Boolean)
  const haySobre = Boolean(mostrar_sobre && parrafos.length > 0)
  const pie = [
    mostrar_ubicacion && direccion,
    mostrar_contacto && email_contacto,
    mostrar_contacto && sitio_web && sinProtocolo(sitio_web),
  ].filter(Boolean).join(' · ')
  let seccion = 0
  const numeral = () => ROMANOS[seccion++]

  return (
    <div className="revista pro-t1">
      <div className="masthead">
        <div className="brand">{nombre_mostrado}</div>
        <div className="date">{fechaMasthead()}</div>
      </div>
      <div className="masthead-rule" />

      <section className={`hero${imagen ? ' con-retrato' : ''}`}>
        <div>
          {cargo_rubro && <span className="mono issue">{cargo_rubro}</span>}
          <h1><Titular texto={eslogan || nombre_mostrado || ''} /></h1>
          <div className="byline">
            Por <span className="name">{nombre_mostrado}</span>
            {wa && <> · <a className="name" href={wa} target="_blank" rel="noreferrer">Agendar ↗</a></>}
          </div>
        </div>
        {imagen && <div><div className="portrait"><img src={imagen} alt={nombre_mostrado || ''} /></div></div>}
      </section>

      {haySobre && (
        <section className="section" id="sobre">
          <div className="section-title">
            <span className="num">{numeral()}</span>
            <h2>{tipo === 'negocio' ? 'Quiénes somos' : 'Sobre mí'}</h2>
          </div>
          <div className="columns">
            {parrafos.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        </section>
      )}

      {productos.length > 0 && (
        <section className="section" id="servicios">
          <div className="section-title">
            <span className="num">{numeral()}</span>
            <h2>Servicios</h2>
          </div>
          <div className="programs">
            {productos.map((p, i) => {
              const { desc, precio, extra } = textosProducto(p)
              return (
                <div className="program" key={p.orden + p.nombre}>
                  {p.imagen && <img className="pro-img" src={p.imagen} alt={p.nombre} loading="lazy" />}
                  <div className="no">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{p.nombre}</h3>
                  {desc && <p>{desc}</p>}
                  {extra && <p>{extra}</p>}
                  {precio && <div className="meta">{precio}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      {cita && (
        <section className="quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <cite>— {[cita.autor, cita.relacion].filter(Boolean).join(', ')}</cite>}
        </section>
      )}

      <ContactoPro tarjeta={tarjeta} />

      <div className="colophon">
        <div className="brand">{nombre_mostrado}</div>
        {pie && <p>{pie}</p>}
        <FirmaKabymur />
      </div>
    </div>
  )
}
