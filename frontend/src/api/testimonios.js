import { llamarApi } from './cliente'

export const obtenerTestimonios = (tarjetaId) => llamarApi(`/tarjetas/${tarjetaId}/testimonios/`)

export const crearTestimonio = (tarjetaId, campos) =>
  llamarApi(`/tarjetas/${tarjetaId}/testimonios/`, {
    method: 'POST',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const actualizarTestimonio = (testimonioId, campos) =>
  llamarApi(`/testimonios/${testimonioId}/`, {
    method: 'PATCH',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const borrarTestimonio = (testimonioId) =>
  llamarApi(`/testimonios/${testimonioId}/`, { method: 'DELETE' })

export const reordenarTestimonios = (tarjetaId, idsEnOrden) =>
  llamarApi(`/tarjetas/${tarjetaId}/testimonios/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ orden: idsEnOrden }),
  })
