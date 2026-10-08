import { llamarApi } from './cliente'

export const obtenerPasos = (tarjetaId) => llamarApi(`/tarjetas/${tarjetaId}/pasos/`)

export const crearPaso = (tarjetaId, campos) =>
  llamarApi(`/tarjetas/${tarjetaId}/pasos/`, {
    method: 'POST',
    body: JSON.stringify(campos),
  })

export const actualizarPaso = (pasoId, campos) =>
  llamarApi(`/pasos/${pasoId}/`, {
    method: 'PATCH',
    body: JSON.stringify(campos),
  })

export const borrarPaso = (pasoId) => llamarApi(`/pasos/${pasoId}/`, { method: 'DELETE' })

export const reordenarPasos = (tarjetaId, idsEnOrden) =>
  llamarApi(`/tarjetas/${tarjetaId}/pasos/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ orden: idsEnOrden }),
  })
