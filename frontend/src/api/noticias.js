import { llamarApi } from './cliente'

export const obtenerNoticias = (tarjetaId) => llamarApi(`/tarjetas/${tarjetaId}/noticias/`)

export const crearNoticia = (tarjetaId, campos) =>
  llamarApi(`/tarjetas/${tarjetaId}/noticias/`, {
    method: 'POST',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const actualizarNoticia = (noticiaId, campos) =>
  llamarApi(`/noticias/${noticiaId}/`, {
    method: 'PATCH',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const borrarNoticia = (noticiaId) => llamarApi(`/noticias/${noticiaId}/`, { method: 'DELETE' })

export const reordenarNoticias = (tarjetaId, idsEnOrden) =>
  llamarApi(`/tarjetas/${tarjetaId}/noticias/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ orden: idsEnOrden }),
  })
