import React from 'react'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, waLink } from './tanda1Comun'
import { FilasProducto, analizarProducto, fuenteGrande, listaZonas, partirTitular } from './proComun'
import './tanda3.css'

const FORMAS = ['circle', 'square', 'tri']

/** Forma (talleres, estilo Bauhaus): círculo, cuadrado y triángulo en rojo,
 * azul y amarillo. El póster es decorativo; los cursos alternan formas. */
export default function PlantillaForma({ tarjeta }) {
  const {
    nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, telefono, whatsapp,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const proximo = tarjeta.mostrar_noticias ? (tarjeta.noticias || [])[0] : null
  const zonas = mostrar_ubicacion ? listaZonas(tarjeta.zonas_cobertura) : []
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const pie = [mostrar_ubicacion && direccion, mostrar_contacto && telefono].filter(Boolean).join(' · ')
  const n = Math.min(productos.length, 3)

  return (
    <div className="forma pro-t1">
      <header className="f-top">
        <span className="f-brand" style={{ overflowWrap: 'anywhere' }}><i className="f-dot" aria-hidden="true" />{(nombre_mostrado || '').toLowerCase()}</span>
        {zonas[0] && <span className="f-tag">{zonas[0]}</span>}
      </header>

      <section className="f-hero">
        <div className="f-poster" aria-hidden="true">
          <span className="f-circle" /><span className="f-quarter" /><span className="f-tri" /><span className="f-bar" /><span className="f-square" />
        </div>
        <div>
          {cargo_rubro && <span className="f-eyebrow">{cargo_rubro}</span>}
          <h1>{antes}{marca && <> <em>{marca}</em></>}</h1>
          {mostrar_sobre && sobre_texto && <p className="f-lead" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="f-btn">Reservar por WhatsApp</a>}
        </div>
      </section>

      {productos.length > 0 && (
        <section className="f-courses" id="cursos">
          <h2>cursos</h2>
          <div className={`f-grid n${n}`}>
            {productos.map((p, i) => {
              const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
              const items = filas.length > 0 ? filas : descripcion ? [{ texto: descripcion, derecha: '' }] : []
              return (
                <article className="f-course" key={p.orden + p.nombre}>
                  <span className={`f-shape ${FORMAS[i % FORMAS.length]}`} aria-hidden="true" />
                  <h3>{p.nombre}</h3>
                  <FilasProducto filas={items} />
                  {extra && <p className="f-text">{extra}</p>}
                  {(precio || corto) && <p className="f-price">{precio}{corto && <> <small>{corto}</small></>}</p>}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {proximo && (
        <section className="f-news">
          <span className="f-eyebrow">Próximo</span>
          <h3>{proximo.titulo}</h3>
          {proximo.resumen && <p>{proximo.resumen}</p>}
        </section>
      )}

      {cita && (
        <section className="f-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <p>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} desde={1} />
      <SeccionFaq tarjeta={tarjeta} />

      <footer className="f-foot" id="contacto">
        <div className="f-foot-shapes" aria-hidden="true"><i /><i /><i /></div>
        <div className="f-foot-big" style={fuenteGrande(nombre_mostrado, 19, 9, 2.2)}>{(nombre_mostrado || '').toLowerCase()}</div>
        {pie && <p>{pie}</p>}
        <p className="f-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
