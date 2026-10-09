import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, waLink } from './tanda1Comun'
import { Estrellas, FilasProducto, analizarProducto, fuenteGrande, inicial, listaZonas, partirTitular } from './proComun'
import './tanda2.css'

function Huella({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="43" rx="14" ry="12" />
      <circle cx="14.5" cy="27" r="6.5" /><circle cx="25" cy="15.5" r="6.5" />
      <circle cx="39" cy="15.5" r="6.5" /><circle cx="49.5" cy="27" r="6.5" />
    </svg>
  )
}

const PASOS_HUELLA = [40, 150, 260, 370, 480, 590, 700, 800]

/** Huella (mascotas): crema, verde azulado y amarillo sol; servicios con forma
 * de ticket, reseñas como fichas y zonas de atención. Layout propio. */
export default function PlantillaHuella({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, horario, telefono, whatsapp,
    mostrar_productos, mostrar_ubicacion, mostrar_contacto, mostrar_sobre,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const testimonios = tarjeta.mostrar_testimonios ? tarjeta.testimonios || [] : []
  const zonas = mostrar_ubicacion ? listaZonas(tarjeta.zonas_cobertura) : []
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const hayInfo = mostrar_ubicacion && (horario || zonas.length > 0)
  const pie = [mostrar_ubicacion && direccion, mostrar_contacto && telefono].filter(Boolean).join(' · ')

  return (
    <div className="huella pro-t1">
      <section className="h-hero">
        <div className="h-top">
          <span className="h-brand"><Huella className="h-paw-ico" />{nombre_mostrado}</span>
          {cargo_rubro && <span className="h-chip">{cargo_rubro}</span>}
        </div>
        <div className="h-grid">
          <div>
            <h1>{antes}{marca && <> <mark>{marca}</mark></>}</h1>
            {mostrar_sobre && sobre_texto && <p className="h-lead" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="h-btn">Agendar por WhatsApp</a>}
          </div>
          <div className="h-visual" aria-hidden={imagen ? undefined : 'true'}>
            <div className="h-sun">{imagen && <img src={imagen} alt={nombre_mostrado || ''} />}</div>
            {!imagen && <Huella className="h-bigpaw" />}
            {zonas.length > 0 && <span className="h-sticker s1">Atendemos en {zonas[0]}</span>}
          </div>
        </div>
      </section>

      <svg className="h-trail" viewBox="0 0 860 48" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {PASOS_HUELLA.map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 4 : 14}) rotate(70 11 11)`}>
            <svg width="22" height="22" viewBox="0 0 64 64">
              <ellipse cx="32" cy="43" rx="14" ry="12" />
              <circle cx="14.5" cy="27" r="6.5" /><circle cx="25" cy="15.5" r="6.5" />
              <circle cx="39" cy="15.5" r="6.5" /><circle cx="49.5" cy="27" r="6.5" />
            </svg>
          </g>
        ))}
      </svg>

      {productos.length > 0 && (
        <section className="h-section" id="servicios">
          <h2>Servicios</h2>
          <div className="h-tickets">
            {productos.map((p) => {
              const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
              return (
                <article className={`h-ticket${filas.length === 0 && !precio && !corto ? ' sin-pie' : ''}`} key={p.orden + p.nombre}>
                  <h3>{p.nombre}</h3>
                  <div>
                    {p.imagen && <img className="pro-img fila" src={p.imagen} alt={p.nombre} loading="lazy" />}
                    {descripcion && <p>{descripcion}</p>}
                    {extra && <p>{extra}</p>}
                  </div>
                  {(filas.length > 0 || precio || corto) && (
                    <div className="h-ticket-bottom">
                      <div className="h-sizes"><FilasProducto filas={filas} max={3} />{corto && <span className="h-short">{corto}</span>}</div>
                      {precio ? <div className="h-from">{precio}</div> : <div />}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {testimonios.length > 0 && (
        <section className="h-section h-reviews" id="testimonios">
          <h2>Lo que dicen</h2>
          <div className="h-cards">
            {testimonios.map((t, i) => (
              <article className="h-card" key={i}>
                <header>
                  <span className="h-avatar">{inicial(t.autor)}</span>
                  <div><b>{t.autor}</b>{t.relacion && <span>{t.relacion}</span>}</div>
                </header>
                <p>“{t.texto}”</p>
                {t.calificacion > 0 && <footer className="h-stars"><Estrellas n={t.calificacion} /></footer>}
              </article>
            ))}
          </div>
        </section>
      )}

      {hayInfo && (
        <section className="h-info">
          {horario && <div><span className="h-lbl">Horario</span><p>{horario}</p></div>}
          {zonas.length > 0 && (
            <div>
              <span className="h-lbl">Zonas</span>
              <div className="h-zones">{zonas.map((z) => <span key={z}>{z}</span>)}</div>
            </div>
          )}
        </section>
      )}

      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <ContactoPro tarjeta={tarjeta} />

      <footer className="h-foot">
        <div className="h-foot-big" style={fuenteGrande(nombre_mostrado, 16, 7, 2.2)}>{nombre_mostrado}</div>
        {pie && <p>{pie}</p>}
        <p className="h-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
