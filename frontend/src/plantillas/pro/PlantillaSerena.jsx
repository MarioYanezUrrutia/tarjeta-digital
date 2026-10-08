import React from 'react'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, textosProducto, sinProtocolo, waLink } from './tanda1Comun'

/** Serena (belleza): hero centrado con arco, sobre en panel rosado, hasta 3
 * servicios destacados y pie oscuro. Layout propio; no usa PlantillaProBase. */
export default function PlantillaSerena({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, horario,
    whatsapp, telefono, sitio_web, tipo,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = (mostrar_productos ? tarjeta.productos || [] : []).slice(0, 3)
  const plural = tipo === 'negocio'
  const lugar = mostrar_ubicacion ? [direccion, horario].filter(Boolean).join(' · ') : ''
  const contacto = mostrar_contacto ? [sitio_web && sinProtocolo(sitio_web), whatsapp || telefono].filter(Boolean).join(' · ') : ''

  return (
    <div className="serena pro-t1">
      <section className="hero">
        {cargo_rubro && <span className="mono eyebrow">{cargo_rubro}</span>}
        <h1>
          <em>{nombre_mostrado}</em>
          {eslogan && <span className="ink">{eslogan}</span>}
        </h1>
        {wa && <a className="cta" href={wa} target="_blank" rel="noreferrer">Agendar por WhatsApp</a>}
        <div className={`hero-img${imagen ? '' : ' deco'}`} aria-hidden={imagen ? undefined : 'true'}>
          {imagen && <img src={imagen} alt={nombre_mostrado || ''} />}
        </div>
      </section>

      {mostrar_sobre && sobre_texto && (
        <section className="section about" id="sobre">
          <div><div className="about-img" aria-hidden="true" /></div>
          <div className="about-text">
            <span className="mono">{plural ? 'Sobre nosotras' : 'Sobre mí'}</span>
            <p>{sobre_texto}</p>
            {nombre_mostrado && <div className="sign">— {nombre_mostrado}</div>}
          </div>
        </section>
      )}

      {productos.length > 0 && (
        <section className="section" id="servicios">
          <div className="section-head">
            <span className="mono">Servicios</span>
            <h2>{plural ? 'Lo que ofrecemos' : 'Lo que ofrezco'}</h2>
            {wa && <p>Reserva tu hora por WhatsApp.</p>}
          </div>
          <div className={`services n${productos.length}`}>
            {productos.map((p) => {
              const { desc, precio, extra } = textosProducto(p)
              return (
                <div className="svc" key={p.orden + p.nombre}>
                  <div className="svc-icon">{(p.nombre || '?').trim()[0]?.toUpperCase()}</div>
                  <h3>{p.nombre}</h3>
                  {desc && <p className="svc-desc">{desc}</p>}
                  {extra && <p className="svc-desc">{extra}</p>}
                  {precio && <div className="svc-price">{precio}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <footer className="footer" id="contacto">
        <div className="name">{nombre_mostrado}</div>
        {lugar && <p>{lugar}</p>}
        {contacto && <div className="foot-mono">{contacto}</div>}
        <FirmaKabymur />
      </footer>
    </div>
  )
}
