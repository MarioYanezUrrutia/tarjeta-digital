import React from 'react'
import { formatearCLP } from '../../constants/tarjetas'
import { FirmaKabymur, SeccionNoticias, SeccionTestimonios, telLink, waLink } from './tanda1Comun'
import { FilasProducto, analizarProducto, fuenteGrande, partirTitular } from './proComun'
import './tanda3.css'

/** Balance (consultoría): verde esmeralda, tarjeta de "Resumen de planes"
 * estilo libro contable (el precio menor abajo con doble subrayado), planes
 * con lista de checks, pasos, preguntas en acordeón y pie oscuro. */
export default function PlantillaBalance({ tarjeta }) {
  const {
    nombre_mostrado, cargo_rubro, eslogan, sobre_texto, profesion, direccion, horario, telefono, whatsapp, email_contacto,
    mostrar_sobre, mostrar_productos, mostrar_ubicacion, mostrar_contacto, mostrar_pasos, mostrar_faq,
  } = tarjeta
  const wa = waLink(whatsapp)
  const productos = mostrar_productos ? tarjeta.productos || [] : []
  const pasos = mostrar_pasos ? tarjeta.pasos || [] : []
  const faqs = mostrar_faq ? tarjeta.faqs || [] : []
  const cita = tarjeta.mostrar_testimonios ? (tarjeta.testimonios || [])[0] : null
  const { antes, marca } = partirTitular(eslogan || nombre_mostrado)

  const conPrecio = productos.filter((p) => p.precio_clp)
  const resumen = conPrecio.slice(0, 3)
  const menor = conPrecio.length > 0 ? Math.min(...conPrecio.map((p) => p.precio_clp)) : null

  const tel = mostrar_contacto ? telLink(telefono) : null
  const enlace2 = tel
    ? { href: tel, texto: `Llamar al ${telefono} →` }
    : mostrar_contacto && email_contacto
      ? { href: `mailto:${email_contacto}`, texto: `Escribir a ${email_contacto} →` }
      : null
  const pie = [
    mostrar_ubicacion && direccion,
    mostrar_ubicacion && horario,
    mostrar_contacto && email_contacto,
  ].filter(Boolean)

  const nav = [
    productos.length > 0 && { href: '#planes', texto: 'Planes' },
    pasos.length > 0 && { href: '#pasos', texto: 'Cómo empezamos' },
    faqs.length > 0 && { href: '#preguntas', texto: 'Preguntas' },
  ].filter(Boolean)

  return (
    <div className="balance pro-t1">
      <header className="b-top">
        <span className="b-brand"><span className="b-mark" aria-hidden="true" />{nombre_mostrado}</span>
        {nav.length > 0 && <nav className="b-nav">{nav.map((n) => <a key={n.href} href={n.href}>{n.texto}</a>)}</nav>}
      </header>

      <section className="b-hero">
        <div>
          {cargo_rubro && <span className="b-eyebrow">{cargo_rubro}</span>}
          <h1>{antes}{marca && <> <span className="b-em">{marca}</span></>}</h1>
          {mostrar_sobre && sobre_texto && <p className="b-lead" style={{ whiteSpace: 'pre-line' }}>{sobre_texto}</p>}
          {(wa || enlace2) && (
            <div className="b-actions">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="b-btn">Escribir por WhatsApp</a>}
              {enlace2 && <a href={enlace2.href} className="b-link">{enlace2.texto}</a>}
            </div>
          )}
          {profesion && <p className="b-fine">{profesion}</p>}
        </div>
        {resumen.length > 0 && (
          <figure className="b-ledger" aria-label="Resumen de planes">
            <figcaption><span>Resumen de planes</span></figcaption>
            <dl>
              {resumen.map((p) => (
                <div key={p.orden + p.nombre}><dt>{p.nombre}</dt><dd>{analizarProducto(p).precio}</dd></div>
              ))}
              <div className="b-total"><dt>Planes desde</dt><dd>{formatearCLP(menor)}</dd></div>
            </dl>
          </figure>
        )}
      </section>

      {productos.length > 0 && (
        <section className="b-plans" id="planes">
          <h2>Planes</h2>
          <div className="b-plan-grid" style={{ marginTop: 24 }}>
            {productos.map((p) => {
              const { descripcion, filas, corto, extra } = analizarProducto(p)
              const items = filas.length > 0 ? filas : descripcion ? [{ texto: descripcion, derecha: '' }] : []
              return (
                <article className="b-plan" key={p.orden + p.nombre}>
                  <h3>{p.nombre}</h3>
                  {p.precio_clp && (
                    <p className="b-price">
                      {p.precio_desde && <span>Desde</span>}
                      {formatearCLP(p.precio_clp)}
                      {corto && <small>{corto}</small>}
                    </p>
                  )}
                  {!p.precio_clp && corto && <p className="b-text">{corto}</p>}
                  <FilasProducto filas={items} check />
                  {extra && <p className="b-text">{extra}</p>}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {pasos.length > 0 && (
        <section className="b-steps" id="pasos">
          <h2>Cómo empezamos</h2>
          <ol className={`n${pasos.length}`}>
            {pasos.map((p) => (
              <li key={p.orden + p.titulo}><h3>{p.titulo}</h3><p>{p.texto}</p></li>
            ))}
          </ol>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="b-faq" id="preguntas">
          <h2>Preguntas frecuentes</h2>
          {faqs.map((f, i) => (
            <details key={i} open={i === 0}>
              <summary>{f.pregunta}</summary>
              <p>{f.respuesta}</p>
            </details>
          ))}
        </section>
      )}

      {cita && (
        <section className="b-quote">
          <blockquote>“{cita.texto}”</blockquote>
          {(cita.autor || cita.relacion) && <p>{[cita.autor, cita.relacion].filter(Boolean).join(' · ')}</p>}
        </section>
      )}

      <SeccionTestimonios tarjeta={tarjeta} desde={1} />
      <SeccionNoticias tarjeta={tarjeta} />

      <footer className="b-foot" id="contacto">
        <div className="b-foot-big" style={fuenteGrande(nombre_mostrado, 18, 8.5, 2.2)}>{nombre_mostrado}</div>
        {pie.length > 0 && <div className="b-foot-grid">{pie.map((t) => <p key={t}>{t}</p>)}</div>}
        <p className="b-sign"><FirmaKabymur /></p>
      </footer>
    </div>
  )
}
