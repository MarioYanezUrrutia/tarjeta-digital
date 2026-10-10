import React from 'react'
import { ContactoPro } from './compartidos'
import { FirmaKabymur, SeccionFaq, SeccionNoticias, SeccionTestimonios, waLink } from './tanda1Comun'
import { FilasProducto, analizarProducto, fuenteGrande, inicial, partirTitular } from './proComun'
import './tanda2.css'

// Texto que gira en el borde del medallón: nombres de los primeros productos
// (o el rubro). Se repite hasta cubrir el anillo y se ajusta con textLength.
function textoAnillo(productos, cargoRubro) {
  const nombres = productos.slice(0, 4).map((p) => (p.nombre || '').trim()).filter(Boolean)
  const base = (nombres.length > 0 ? nombres.join(' · ') : (cargoRubro || '').trim()).toUpperCase()
  if (!base) return ''
  let texto = `${base} · `
  while (texto.length < 40) texto += `${base} · `
  return texto
}

/** Lustre (lujo metálico): fondo oscuro con brillo burdeos, dorado, medallón
 * que gira lento y carta con puntos guía. Layout propio. */
export default function PlantillaLustre({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, eslogan, sobre_texto, direccion, horario, whatsapp,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)
  const anillo = textoAnillo(productos, cargo_rubro)
  const franja = [
    mostrar_ubicacion && horario && { valor: horario, etiqueta: 'Horario' },
    mostrar_ubicacion && direccion && { valor: direccion, etiqueta: 'Dirección' },
    mostrar_contacto && whatsapp && { valor: whatsapp, etiqueta: 'Reservas por WhatsApp' },
  ].filter(Boolean)
  const pie = [mostrar_ubicacion && direccion, mostrar_contacto && whatsapp].filter(Boolean).join(' · ')
  const hayContacto = Boolean(wa || franja.length > 0)

  return (
    <div className="lustre pro-t1 grainy">
      <section className="l-hero">
        <nav className="l-nav">
          <span className="l-logo" style={{ overflowWrap: 'anywhere' }}>{(nombre_mostrado || '').toUpperCase()}</span>
          <span className="l-navlinks">
            {productos.length > 0 && <a href="#carta">Carta</a>}
            {wa && <a href={wa} target="_blank" rel="noreferrer">Reservas</a>}
            {hayContacto && <a href="#contacto">Contacto</a>}
          </span>
        </nav>
        <div className="l-grid">
          <div>
            {cargo_rubro && <span className="l-eyebrow">{cargo_rubro}</span>}
            <h1>{antes}{marca && <> <em className="gold">{marca}</em></>}</h1>
            {mostrar_sobre && sobre_texto && <p id="sobre" className="l-body" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
            {(wa || productos.length > 0) && (
              <div className="l-actions">
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="l-btn-gold">Reservar por WhatsApp</a>}
                {productos.length > 0 && <a href="#carta" className="l-btn-line">Ver la carta</a>}
              </div>
            )}
          </div>
          <div className="l-medal-wrap">
            {imagen ? <img data-cp={tarjeta.plantilla} className="pro-hero-img redonda" src={imagen} alt={nombre_mostrado || ''} /> : <svg className="l-medal" viewBox="0 0 300 300" role="img" aria-label={`Medallón dorado con la inicial de ${nombre_mostrado || 'la marca'}`}>
              <defs>
                <linearGradient id="lus-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8C6A2F" />
                  <stop offset=".3" stopColor="#F6E2A6" />
                  <stop offset=".55" stopColor="#B98B3E" />
                  <stop offset=".8" stopColor="#E8C878" />
                  <stop offset="1" stopColor="#8C6A2F" />
                </linearGradient>
                <radialGradient id="lus-core" cx=".5" cy=".42" r=".62">
                  <stop offset="0" stopColor="#5E1C2E" />
                  <stop offset="1" stopColor="#1A0F12" />
                </radialGradient>
                <path id="lus-ring" d="M150,150 m-116,0 a116,116 0 1,1 232,0 a116,116 0 1,1 -232,0" />
              </defs>
              <circle cx="150" cy="150" r="142" fill="none" stroke="url(#lus-gold)" strokeWidth="1.4" />
              <circle cx="150" cy="150" r="132" fill="none" stroke="url(#lus-gold)" strokeWidth=".6" opacity=".6" />
              {anillo && (
                <g className="spin">
                  <text className="l-ring-text" fill="url(#lus-gold)">
                    <textPath href="#lus-ring" textLength="720" lengthAdjust="spacing">{anillo}</textPath>
                  </text>
                </g>
              )}
              <circle cx="150" cy="150" r="98" fill="url(#lus-core)" stroke="url(#lus-gold)" strokeWidth="2" />
              <text className="l-mono" x="150" y="186" textAnchor="middle" fill="url(#lus-gold)">{inicial(nombre_mostrado)}</text>
            </svg>}
          </div>
        </div>
        {franja.length > 0 && (
          <div className="l-strip">
            {franja.map((f) => (
              <div key={f.etiqueta}><b className="gold">{f.valor}</b><span>{f.etiqueta}</span></div>
            ))}
          </div>
        )}
      </section>

      {productos.length > 0 && (
        <section className="l-carta" id="carta">
          <div className="l-frame">
            <span className="l-eyebrow">La carta</span>
            <h2>Servicios</h2>
            <ul className="l-menu">
              {productos.map((p) => {
                const { descripcion, filas, corto, extra, precio } = analizarProducto(p)
                return (
                  <li key={p.orden + p.nombre}>
                    {p.imagen && <img className="pro-img fila" src={p.imagen} alt={p.nombre} loading="lazy" />}
                    <div className="l-line">
                      <span>{p.nombre}</span>
                      {(precio || corto) && <i />}
                      {(precio || corto) && (
                        <b>{corto && <em>{corto}</em>}{precio}</b>
                      )}
                    </div>
                    {descripcion && <p>{descripcion}</p>}
                    <FilasProducto filas={filas} />
                    {extra && <p>{extra}</p>}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {cita && (
        <section className="l-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <cite>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</cite>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />
      <SeccionFaq tarjeta={tarjeta} />

      <ContactoPro tarjeta={tarjeta} />

      <footer className="l-foot">
        <div className="l-foot-big gold" style={fuenteGrande(nombre_mostrado, 21, 10, 2.4)}>{nombre_mostrado}</div>
        {pie && <p>{pie}</p>}
        <p className="l-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
