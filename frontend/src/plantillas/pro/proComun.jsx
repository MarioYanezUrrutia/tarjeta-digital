import React from 'react'
import { textoPrecioProducto } from '../../constants/tarjetas'
import './tanda1Comun'

// Utilidades compartidas por las plantillas de las tandas 2 y 3. Las reglas
// de contenido (titular, detalle corto, filas con " · ") son las mismas en
// las 8, así que viven acá y no en cada plantilla.

// Titular: lo que va después de la primera coma se resalta con el estilo de
// cada plantilla. Sin coma, no hay parte resaltada.
export function partirTitular(texto) {
  const t = (texto || '').trim()
  const i = t.indexOf(',')
  if (i < 0) return { antes: t, marca: '' }
  return { antes: t.slice(0, i + 1), marca: t.slice(i + 1).trim() }
}

/** Resume un producto según las reglas comunes:
 *  - caracteristicas con varias líneas (o con " · "): cada línea es una fila;
 *    lo que va después del último " · " queda a la derecha. Una sola línea
 *    sin " · " es la descripción.
 *  - detalle de 20 caracteres o menos: dato corto junto al precio; si es más
 *    largo, texto aparte (`extra`).
 *  - precio: precio_clp en es-CL, con "Desde" si precio_desde ('' si no hay). */
export function analizarProducto(p) {
  const lineas = (p.caracteristicas || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const hayFilas = lineas.length > 1 || (lineas.length === 1 && lineas[0].includes(' · '))
  const filas = hayFilas
    ? lineas.map((l) => {
        const i = l.lastIndexOf(' · ')
        return i < 0 ? { texto: l, derecha: '' } : { texto: l.slice(0, i), derecha: l.slice(i + 3) }
      })
    : []
  const detalle = (p.detalle || '').trim()
  const corto = detalle.length > 0 && detalle.length <= 20
  return {
    descripcion: hayFilas ? '' : lineas[0] || '',
    filas,
    corto: corto ? detalle : '',
    extra: corto ? '' : detalle,
    precio: textoPrecioProducto(p),
  }
}

export function FilasProducto({ filas, check = false, max }) {
  const lista = max ? filas.slice(0, max) : filas
  if (lista.length === 0) return null
  return (
    <ul className={`t1-filas${check ? ' check' : ''}`}>
      {lista.map((f, i) => (
        <li key={i}>
          <span>{f.texto}</span>
          {f.derecha && <b>{f.derecha}</b>}
        </li>
      ))}
    </ul>
  )
}

// Tamaño de los títulos gigantes de los pies: se achica con nombres largos
// para que no se corten a 390 px.
export function fuenteGrande(nombre, vwMax, remMax, remMin = 1.8) {
  const largo = Math.max((nombre || '').length, 1)
  const vw = Math.min(vwMax, 150 / largo)
  return { fontSize: `clamp(${remMin}rem, ${vw.toFixed(1)}vw, ${remMax}rem)` }
}

export const inicial = (nombre) => (nombre || '?').trim()[0]?.toUpperCase() || '?'

export function listaZonas(zonas) {
  return (zonas || '').split(',').map((z) => z.trim()).filter(Boolean)
}

// Instagram puede venir como URL o como usuario suelto ("estudioaura"/"@estudioaura").
export function redSocial(valor, base) {
  const v = (valor || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) {
    const usuario = v.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop().replace(/^@/, '')
    return { href: v, usuario }
  }
  const usuario = v.replace(/^@/, '')
  return { href: `${base}${usuario}`, usuario }
}

export function Estrellas({ n }) {
  const llenas = Math.max(0, Math.min(5, n || 0))
  if (!llenas) return null
  return <span aria-label={`${llenas} de 5`}>{'★'.repeat(llenas)}</span>
}
