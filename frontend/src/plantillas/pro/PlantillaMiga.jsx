import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, waLink } from './tanda1Comun'
import { analizarProducto, fuenteGrande, listaZonas, partirTitular } from './proComun'
import './tanda3.css'

function Torta() {
  return (
    <svg className="g-cake" viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="144" fill="#FFFFFF" stroke="#EBD9C2" strokeWidth="2" />
      <circle cx="150" cy="150" r="132" fill="none" stroke="#EBD9C2" strokeWidth="1.5" strokeDasharray="3 7" />
      <circle cx="150" cy="150" r="112" fill="#F8E6CC" stroke="#EACFAA" strokeWidth="6" />
      <circle cx="150" cy="150" r="70" fill="none" stroke="#F4D27E" strokeWidth="12" strokeDasharray="1 15" strokeLinecap="round" />
      <g fill="#C7385B">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
          const r = (a * Math.PI) / 180
          return <circle key={a} cx={150 + 92 * Math.cos(r)} cy={150 + 92 * Math.sin(r)} r="11" />
        })}
      </g>
      <g fill="#FFFFFF" opacity=".7">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => {
          const r = (a * Math.PI) / 180
          return <circle key={a} cx={147 + 92 * Math.cos(r)} cy={146 + 92 * Math.sin(r)} r="2.5" />
        })}
      </g>
    </svg>
  )
}

/** Miga (comida por encargo): crema, frambuesa y mantequilla; platos con filas
 * por porción o tamaño, pasos de "Cómo encargar" y datos de retiro/despacho. */
export default function PlantillaMiga({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, horario, telefono, whatsapp,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto, mostrar_pasos,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const pasos = mostrar_pasos ? tarjeta.pasos || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const nota = tarjeta.mostrar_noticias ? (tarjeta.noticias || [])[0] : null
  const zonas = mostrar_ubicacion ? listaZonas(tarjeta.zonas_cobertura) : []
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const hayInfo = mostrar_ubicacion && (horario || zonas.length > 0)
  const pie = [mostrar_ubicacion && direccion, mostrar_contacto && telefono].filter(Boolean).join(' · ')

  return (
    <div className="miga pro-t1">
      <header className="g-top">
        <span className="g-brand" style={{ overflowWrap: 'anywhere' }}>{nombre_mostrado}</span>
        {cargo_rubro && <span className="g-chip">{cargo_rubro}</span>}
      </header>

      <section className="g-hero">
        <div>
          <h1>{antes}{marca && <> <span className="g-em">{marca}</span></>}</h1>
          {mostrar_sobre && sobre_texto && <p className="g-lead" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="g-btn">Encargar por WhatsApp</a>}
        </div>
        <div className="g-visual">
          {imagen
            ? <div className="g-photo"><img src={imagen} alt={nombre_mostrado || ''} /></div>
            : <Torta />}
          {nota && <p className="g-note">{nota.titulo}</p>}
        </div>
      </section>

      {productos.length > 0 && (
        <section className="g-menu g-scallop" id="productos">
          <h2>Para encargar</h2>
          <div className="g-cards">
            {productos.map((p) => {
              const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
              return (
                <article className="g-card" key={p.orden + p.nombre}>
                  {p.imagen && <img className="pro-img" src={p.imagen} alt={p.nombre} loading="lazy" />}
                  <h3>{p.nombre}</h3>
                  {descripcion && <p>{descripcion}</p>}
                  {filas.length > 0 && (
                    <ul className="g-rows">
                      {filas.map((f, i) => <li key={i}>{f.texto}{f.derecha && <b>{f.derecha}</b>}</li>)}
                    </ul>
                  )}
                  {extra && <p>{extra}</p>}
                  {(precio || corto) && <p className="g-from">{precio}{corto && <small>{corto}</small>}</p>}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {pasos.length > 0 && (
        <section className="g-steps" id="pasos">
          <h2>Cómo encargar</h2>
          <ol>
            {pasos.map((p, i) => (
              <li key={p.orden + p.titulo}><span>{i + 1}</span><h3>{p.titulo}</h3><p>{p.texto}</p></li>
            ))}
          </ol>
        </section>
      )}

      {hayInfo && (
        <section className="g-info">
          {horario && <div><span className="g-lbl">Retiro</span><p>{horario}</p></div>}
          {zonas.length > 0 && (
            <div>
              <span className="g-lbl">Despacho a</span>
              <div className="g-zones">{zonas.map((z) => <span key={z}>{z}</span>)}</div>
            </div>
          )}
        </section>
      )}

      {cita && (
        <section className="g-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <p>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <ContactoPro tarjeta={tarjeta} />

      <footer className="g-foot">
        <div className="g-foot-big" style={fuenteGrande(nombre_mostrado, 20, 9, 2.4)}>{nombre_mostrado}</div>
        {pie && <p>{pie}</p>}
        <p className="g-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
