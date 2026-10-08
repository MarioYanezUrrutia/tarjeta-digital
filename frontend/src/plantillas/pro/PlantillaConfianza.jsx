import React from 'react'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, textosProducto, telLink, waLink } from './tanda1Comun'

// "Tu llave rota, resuelta hoy." → destaca lo que viene tras la primera coma.
function partirEslogan(texto) {
  const i = texto.indexOf(',')
  if (i < 0) return { antes: texto, marca: '' }
  return { antes: texto.slice(0, i + 1) + ' ', marca: texto.slice(i + 1).trim() }
}

/** Confianza (oficios): WhatsApp como acción principal, barra de zonas
 * (salen de zonas_cobertura; sin zonas se oculta), trabajos con precio y barra fija. */
export default function PlantillaConfianza({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, horario, zonas_cobertura,
    whatsapp, telefono, tipo, mostrar_sobre, mostrar_productos, mostrar_ubicacion,
  } = tarjeta
  const wa = waLink(whatsapp)
  const tel = telLink(telefono)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const zonas = mostrar_ubicacion && zonas_cobertura
    ? zonas_cobertura.split(',').map((z) => z.trim()).filter(Boolean)
    : []
  const { antes, marca } = eslogan ? partirEslogan(eslogan) : { antes: cargo_rubro || nombre_mostrado, marca: '' }
  const bajada = eslogan ? cargo_rubro : ''
  const inicial = (nombre_mostrado || '?').trim()[0]?.toUpperCase()
  const primerTestimonio = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const hayLugar = mostrar_ubicacion && (direccion || horario)

  return (
    <div className="confianza pro-t1">
      <section className="hero">
        <div className="brand">
          <div className="logo">
            <div className="logo-mark">{inicial}</div>
            <span>{nombre_mostrado}</span>
          </div>
          {tel && <a className="call" href={tel}>Llamar</a>}
        </div>
        <div className={`hero-grid${imagen ? ' con-visual' : ''}`}>
          <div>
            <h1>{antes}{marca && <span className="mark">{marca}</span>}</h1>
            {bajada && <p className="lead">{bajada}</p>}
            <div className="cta-row">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-primary">WhatsApp directo →</a>}
              {tel && <a href={tel} className="btn btn-secondary">Llamar</a>}
            </div>
          </div>
          {imagen && (
            <div className="hero-visual"><img src={imagen} alt={nombre_mostrado || ''} /></div>
          )}
        </div>
      </section>

      {zonas.length > 0 && (
        <div className="zones">
          <span className="label">Zonas que cubro</span>
          {zonas.map((z) => <span className="chip" key={z}>{z}</span>)}
        </div>
      )}

      {mostrar_sobre && sobre_texto && (
        <section className="section" id="sobre">
          <h2>{tipo === 'negocio' ? 'Quiénes somos' : 'Quién soy'}</h2>
          <p className="about-p">{sobre_texto}</p>
        </section>
      )}

      {productos.length > 0 && (
        <section className="section" id="servicios" style={{ paddingTop: mostrar_sobre && sobre_texto ? 0 : undefined }}>
          <h2>Trabajos que hago</h2>
          <div className="svc-grid">
            {productos.map((p) => {
              const { desc, precio, extra } = textosProducto(p)
              return (
                <div className="svc" key={p.orden + p.nombre}>
                  <div className="ico" aria-hidden="true">{(p.nombre || '?').trim()[0]?.toUpperCase()}</div>
                  <div>
                    <h3>{p.nombre}</h3>
                    {desc && <p className="desc">{desc}</p>}
                    {extra && <p className="desc">{extra}</p>}
                  </div>
                  {precio && <div className="price">{precio}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {primerTestimonio && (
        <section className="trust">
          {primerTestimonio.calificacion > 0 && (
            <div className="t1-estrellas">{'★'.repeat(Math.min(5, primerTestimonio.calificacion))}</div>
          )}
          <p className="big">“{primerTestimonio.texto}”</p>
          <p className="sub">{[primerTestimonio.autor, primerTestimonio.relacion].filter(Boolean).join(' · ')}</p>
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <footer className="footer" id="contacto">
        <b>{nombre_mostrado}</b>
        {hayLugar && <div>{[direccion, horario].filter(Boolean).join(' · ')}</div>}
        <FirmaKabymur />
      </footer>

      {wa && <a className="sticky-bar" href={wa} target="_blank" rel="noreferrer">¿Necesitas ahora? Escríbeme por WhatsApp</a>}
    </div>
  )
}
