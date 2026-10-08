import React from 'react'
import { FirmaKabymur, SeccionFaq, SeccionTestimonios, waLink } from './tanda1Comun'
import { FilasProducto, analizarProducto, fuenteGrande, partesFecha, partirTitular, redSocial } from './proComun'
import './tanda3.css'

/** Tinta (eventos y música, estética risográfica): dos tintas que se
 * superponen, puntos de trama y grano de papel. Los packs son productos y
 * las fechas, noticias con su día y mes. */
export default function PlantillaTinta({ tarjeta }) {
  const {
    nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, telefono, whatsapp, instagram,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto, mostrar_redes,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const fechas = tarjeta.mostrar_noticias ? tarjeta.noticias || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const ig = mostrar_redes ? redSocial(instagram, 'https://www.instagram.com/') : null
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const pie = [mostrar_ubicacion && direccion, mostrar_contacto && telefono].filter(Boolean).join(' · ')

  return (
    <div className="tinta pro-t1 grainy">
      <div className="t-art" aria-hidden="true"><span className="t-halftone" /><span className="t-rect" /><span className="t-ring" /></div>
      <header className="t-top">
        <span className="t-brand">{nombre_mostrado}</span>
        {cargo_rubro && <span className="t-tag">{cargo_rubro}</span>}
      </header>

      <section className="t-hero">
        <h1><span>{antes}</span>{marca && <span className="t-hl">{marca}</span>}</h1>
        {mostrar_sobre && sobre_texto && <p className="t-lead"><mark style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</mark></p>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="t-btn">Cotizar por WhatsApp</a>}
      </section>

      {productos.length > 0 && (
        <section className="t-packs" id="packs">
          <h2>Packs</h2>
          <div className="t-pack-list">
            {productos.map((p) => {
              const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
              return (
                <article className="t-pack" key={p.orden + p.nombre}>
                  <div className="t-pack-head">
                    <h3>{p.nombre}</h3>
                    {(precio || corto) && <p className="t-price">{[precio, corto].filter(Boolean).join(' · ')}</p>}
                  </div>
                  {descripcion && <p>{descripcion}</p>}
                  <FilasProducto filas={filas} />
                  {extra && <p>{extra}</p>}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {fechas.length > 0 && (
        <section className="t-dates" id="fechas">
          <h2>Próximas fechas</h2>
          <ul className="t-gigs">
            {fechas.map((n, i) => {
              const f = partesFecha(n.fecha)
              return (
                <li key={i} className={f ? undefined : 'sin-fecha'}>
                  {f && <span className="t-date"><b>{f.dia}</b>{f.mes}</span>}
                  <div>
                    <h3>{n.titulo}</h3>
                    {n.resumen && <p>{n.resumen}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {cita && (
        <section className="t-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <p>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionFaq tarjeta={tarjeta} />

      <footer className="t-foot" id="contacto">
        <div className="t-foot-big" style={fuenteGrande(nombre_mostrado, 16, 8, 2.2)}>{nombre_mostrado}</div>
        {(pie || ig) && (
          <p>
            {pie}
            {pie && ig && ' · '}
            {ig && <a href={ig.href} target="_blank" rel="noreferrer">@{ig.usuario}</a>}
          </p>
        )}
        <p className="t-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
