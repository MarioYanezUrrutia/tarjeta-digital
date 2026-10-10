import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, waLink } from './tanda1Comun'
import { analizarProducto, fuenteGrande, partirTitular, redSocial } from './proComun'
import './tanda2.css'

const COLORES = ['pink', 'lilac', '', 'orange']
const FORMAS = ['circulo', 'cuadrado', 'arco', 'rombo']

/** Mosaico (bento): cada dato de la landing es una tarjeta propia con borde
 * grueso y sombra dura. Las tarjetas sin datos no se muestran y la grilla
 * se reacomoda sola. Layout propio. */
export default function PlantillaMosaico({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, profesion, direccion, horario, instagram, whatsapp,
    tipo, mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_redes,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const novedad = tarjeta.mostrar_noticias ? (tarjeta.noticias || [])[0] : null
  const ig = mostrar_redes ? redSocial(instagram, 'https://www.instagram.com/') : null
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const hayLugar = mostrar_ubicacion && (horario || direccion)
  // Las tarjetas de 1 columna van de a pares; si quedan impares, la última se ensancha.
  const sueltas = productos.length + (hayLugar ? 1 : 0) + (ig ? 1 : 0)
  const ensancharUltima = sueltas % 2 === 1
  const ultima = ig ? 'ig' : hayLugar ? 'lugar' : 'producto'

  return (
    <div className="mosaico pro-t1">
      <header className="m-top">
        <span className="m-logo" style={{ overflowWrap: 'anywhere' }}>{(nombre_mostrado || '').toUpperCase()}</span>
        {cargo_rubro && <span className="m-tag">{cargo_rubro}</span>}
      </header>

      <div className="m-bento">
        <section className="m-tile m-hero">
          {profesion && <span className="m-kicker">{profesion}</span>}
          <h1>{antes}{marca && <> <span className="m-hl">{marca}</span></>}</h1>
          {imagen && <img data-cp={tarjeta.plantilla} className="pro-hero-img" src={imagen} alt={nombre_mostrado || ''} />}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="m-btn">Escribir por WhatsApp</a>}
        </section>

        {mostrar_sobre && sobre_texto && (
          <section className="m-tile m-about" id="sobre">
            <span className="m-kicker">{tipo === 'negocio' ? 'Nosotros' : 'Sobre mí'}</span>
            <p style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>
          </section>
        )}

        {productos.map((p, i) => {
          const { descripcion, corto, extra, precio } = analizarProducto(p)
          return (
            <article className={`m-tile m-prod ${COLORES[i % COLORES.length]}${ensancharUltima && ultima === 'producto' && i === productos.length - 1 ? ' m-wide' : ''}`} key={p.orden + p.nombre}>
              {p.imagen
                ? <img className="m-photo" src={p.imagen} alt={p.nombre} loading="lazy" />
                : <div className={`m-shape ${FORMAS[i % FORMAS.length]}`} aria-hidden="true" />}
              <h3>{p.nombre}</h3>
              {descripcion && <p className="m-desc">{descripcion}</p>}
              {extra && <p className="m-desc">{extra}</p>}
              {precio && <p className="m-price">{precio}</p>}
              {corto && <p className="m-short">{corto}</p>}
            </article>
          )
        })}

        {hayLugar && (
          <section className={`m-tile m-info${ensancharUltima && ultima === 'lugar' ? ' m-wide' : ''}`}>
            <span className="m-kicker">Dónde y cuándo</span>
            <p>{[direccion, horario].filter(Boolean).map((t, i) => <React.Fragment key={t}>{i > 0 && <br />}{t}</React.Fragment>)}</p>
          </section>
        )}

        {ig && (
          <a className={`m-tile m-ig${ensancharUltima && ultima === 'ig' ? ' m-wide' : ''}`} href={ig.href} target="_blank" rel="noreferrer">
            <span className="m-kicker">Instagram</span>
            <p className="m-handle">@{ig.usuario}</p>
            <span className="m-arrow" aria-hidden="true">↗</span>
          </a>
        )}

        {cita && (
          <section className="m-tile m-quote">
            <p>“{cita.texto}”</p>
            {(cita.autor || cita.relacion) && <span>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</span>}
          </section>
        )}

        {novedad && (
          <section className="m-tile m-news">
            {novedad.imagen && <img className="pro-img" src={novedad.imagen} alt={novedad.titulo || ''} loading="lazy" />}
            <span className="m-kicker">Novedad</span>
            <h3>{novedad.titulo}</h3>
            {novedad.resumen && <p>{novedad.resumen}</p>}
          </section>
        )}
      </div>

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} desde={1} />
      <SeccionFaq tarjeta={tarjeta} />

      <ContactoPro tarjeta={tarjeta} />

      <footer className="m-foot">
        <span className="m-foot-big" style={fuenteGrande(nombre_mostrado, 14, 6.5, 2)}>{(nombre_mostrado || '').toUpperCase()}</span>
        <span className="m-sign"><FirmaKabymur /></span>
      </footer>
    </div>
  )
}
