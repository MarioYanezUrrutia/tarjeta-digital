import React from 'react'
import { textoPrecioProducto } from '../../constants/tarjetas'
import './tanda1.css'

// Piezas compartidas por las 4 plantillas de la tanda 1 (Serena, Confianza,
// Vacío, Revista). El estilo de cada bloque sale de las variables CSS de la
// clase raíz de la plantilla (ver tanda1.css), así que se ven "de su tema".

export const URL_KABYMUR = 'https://tarjeta.kabymur.com'

export function waLink(whatsapp) {
  const digitos = (whatsapp || '').replace(/\D/g, '')
  return digitos ? `https://wa.me/${digitos}` : null
}

export function telLink(telefono) {
  const limpio = (telefono || '').replace(/[^\d+]/g, '')
  return limpio ? `tel:${limpio}` : null
}

export function sinProtocolo(url) {
  return (url || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

// Textos de un producto: `caracteristicas` = descripción corta, `detalle` =
// texto libre (siempre texto, nunca precio), `precio` sale de precio_clp
// ("$25.000" / "Desde $25.000"; vacío si no tiene).
export function textosProducto(p) {
  return {
    desc: (p.caracteristicas || '').trim(),
    extra: (p.detalle || '').trim(),
    precio: textoPrecioProducto(p),
  }
}

export function FirmaKabymur({ className = '' }) {
  return (
    <a href={URL_KABYMUR} target="_blank" rel="noopener noreferrer" className={`t1-sign ${className}`}>
      Hecho con Kabymur
    </a>
  )
}

function Estrellas({ n }) {
  const llenas = Math.max(0, Math.min(5, n || 0))
  if (!llenas) return null
  return <div className="t1-estrellas" aria-label={`${llenas} de 5`}>{'★'.repeat(llenas)}{'☆'.repeat(5 - llenas)}</div>
}

export function SeccionNoticias({ tarjeta, desde = 0 }) {
  const { mostrar_noticias } = tarjeta
  const noticias = (tarjeta.noticias || []).slice(desde)
  if (!mostrar_noticias || noticias.length === 0) return null
  return (
    <section className="t1-extra" id="noticias">
      <h2>Noticias y novedades</h2>
      <div className="t1-grid">
        {noticias.map((n, i) => (
          <article key={i} className="t1-card">
            {n.imagen && <img src={n.imagen} alt={n.titulo || ''} loading="lazy" />}
            {n.fecha && <p className="t1-fecha">{n.fecha}</p>}
            <h3>{n.titulo}</h3>
            {n.resumen && <p>{n.resumen}</p>}
            {n.enlace && <a className="t1-mas" href={n.enlace} target="_blank" rel="noreferrer">Ver más →</a>}
          </article>
        ))}
      </div>
    </section>
  )
}

export function SeccionTestimonios({ tarjeta, desde = 0 }) {
  const { mostrar_testimonios, testimonios = [] } = tarjeta
  const lista = testimonios.slice(desde)
  if (!mostrar_testimonios || lista.length === 0) return null
  return (
    <section className="t1-extra" id="testimonios">
      <h2>Lo que dicen</h2>
      <div className="t1-grid">
        {lista.map((t, i) => (
          <figure key={i} className="t1-card">
            <Estrellas n={t.calificacion} />
            <blockquote className="t1-cita">“{t.texto}”</blockquote>
            <figcaption className="t1-autor">
              {t.autor}
              {t.relacion && <span>{t.relacion}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function SeccionFaq({ tarjeta }) {
  const { mostrar_faq, faqs = [] } = tarjeta
  if (!mostrar_faq || faqs.length === 0) return null
  return (
    <section className="t1-extra" id="faq">
      <h2>Preguntas frecuentes</h2>
      <div className="t1-faq">
        {faqs.map((f, i) => (
          <details key={i}>
            <summary>{f.pregunta}</summary>
            <p>{f.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
