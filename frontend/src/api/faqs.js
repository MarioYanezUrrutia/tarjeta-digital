import { llamarApi } from './cliente'

export const obtenerFaqs = (tarjetaId) => llamarApi(`/tarjetas/${tarjetaId}/faqs/`)

export const crearFaq = (tarjetaId, campos) =>
  llamarApi(`/tarjetas/${tarjetaId}/faqs/`, {
    method: 'POST',
    body: JSON.stringify(campos),
  })

export const actualizarFaq = (faqId, campos) =>
  llamarApi(`/faqs/${faqId}/`, {
    method: 'PATCH',
    body: JSON.stringify(campos),
  })

export const borrarFaq = (faqId) => llamarApi(`/faqs/${faqId}/`, { method: 'DELETE' })

export const reordenarFaqs = (tarjetaId, idsEnOrden) =>
  llamarApi(`/tarjetas/${tarjetaId}/faqs/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ orden: idsEnOrden }),
  })
