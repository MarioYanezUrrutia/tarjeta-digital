import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, waLink } from './tanda1Comun'
import { FilasProducto, analizarProducto, fuenteGrande, partirTitular } from './proComun'
import './tanda2.css'

/** Pausa (salud y bienestar): tonos arcilla y salvia, forma orgánica con un
 * anillo que "respira", pasos de "Cómo trabajo", atenciones en filas y pie
 * grande. Layout propio; no usa PlantillaProBase. */
export default function PlantillaPausa({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, profesion, direccion, horario, telefono, whatsapp,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto, mostrar_pasos,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const pasos = mostrar_pasos ? tarjeta.pasos || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const pie = [
    mostrar_ubicacion && direccion,
    mostrar_ubicacion && horario,
    mostrar_contacto && telefono,
  ].filter(Boolean)

  return (
    <div className="pausa pro-t1">
      <header className="p-top">
        <span className="p-brand">{nombre_mostrado}</span>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="p-link">Reservar</a>}
      </header>

      <section className="p-hero grainy">
        <div>
          {cargo_rubro && <span className="p-eyebrow">{cargo_rubro}</span>}
          <h1>{antes}{marca && <> <em>{marca}</em></>}</h1>
          {mostrar_sobre && sobre_texto && <p className="p-lead" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
          {(wa || productos.length > 0) && (
            <div className="p-actions">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="p-btn">Reservar hora</a>}
              {productos.length > 0 && <a href="#atenciones" className="p-textlink">Ver atenciones ↓</a>}
            </div>
          )}
          {profesion && <p className="p-fine">{profesion}</p>}
        </div>
        <div className="p-hero-visual" aria-hidden={imagen ? undefined : 'true'}>
          <div className="p-blob">
            {imagen && <div className="p-photo"><img src={imagen} alt={nombre_mostrado || ''} /></div>}
            <div className="p-breath" />
          </div>
        </div>
      </section>

      <svg className="p-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,44 C240,84 480,4 720,34 C960,64 1200,14 1440,40 L1440,80 L0,80 Z" />
      </svg>

      {pasos.length > 0 && (
        <section className="p-steps" id="pasos">
          <h2>Cómo trabajo</h2>
          <ol>
            {pasos.map((p, i) => (
              <li key={p.orden + p.titulo}>
                <span className="p-num">{i + 1}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {productos.length > 0 && (
        <section className="p-services" id="atenciones">
          <h2>Atenciones</h2>
          <div className="p-rows">
            {productos.map((p) => {
              const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
              return (
                <div className="p-row" key={p.orden + p.nombre}>
                  <div>
                    {p.imagen && <img className="pro-img fila" src={p.imagen} alt={p.nombre} loading="lazy" />}
                    <h3>{p.nombre}</h3>
                    {descripcion && <p>{descripcion}</p>}
                    <FilasProducto filas={filas} />
                    {extra && <p>{extra}</p>}
                  </div>
                  <span className="p-dur">{corto}</span>
                  <span className="p-price">{precio}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {cita && (
        <section className="p-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <p className="p-cite">{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <ContactoPro tarjeta={tarjeta} />

      <footer className="p-foot">
        <div className="p-foot-big" style={fuenteGrande(nombre_mostrado, 20, 9, 2.4)}>{nombre_mostrado}</div>
        {pie.length > 0 && (
          <div className="p-foot-grid">
            {pie.map((t) => <p key={t}>{t}</p>)}
          </div>
        )}
        <p className="p-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
