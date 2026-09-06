import { llamarApi } from './cliente'

export const obtenerProductos = (tarjetaId) => llamarApi(`/tarjetas/${tarjetaId}/productos/`)

// `campos` puede ser un objeto plano (JSON, sin imagen) o un FormData ya
// armado (cuando el producto incluye una imagen) — mismo patrón que
// actualizarTarjeta en api/tarjetas.js.
export const crearProducto = (tarjetaId, campos) =>
  llamarApi(`/tarjetas/${tarjetaId}/productos/`, {
    method: 'POST',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const actualizarProducto = (productoId, campos) =>
  llamarApi(`/productos/${productoId}/`, {
    method: 'PATCH',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const borrarProducto = (productoId) => llamarApi(`/productos/${productoId}/`, { method: 'DELETE' })

export const reordenarProductos = (tarjetaId, idsEnOrden) =>
  llamarApi(`/tarjetas/${tarjetaId}/productos/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ orden: idsEnOrden }),
  })
