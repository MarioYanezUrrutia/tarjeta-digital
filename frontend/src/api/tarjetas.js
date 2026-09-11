import { llamarApi } from './cliente'

export const obtenerMisTarjetas = () => llamarApi('/mis-tarjetas/')

export const crearTarjeta = () => llamarApi('/tarjetas/', { method: 'POST' })

export const obtenerTarjeta = (id) => llamarApi(`/tarjetas/${id}/`)

// `campos` puede ser un objeto plano (se manda como JSON, como siempre) o un
// FormData ya armado (cuando el guardado incluye una imagen nueva — ver
// TarjetaEditor.jsx) — en ese caso se manda tal cual, sin stringify.
export const actualizarTarjeta = (id, campos) =>
  llamarApi(`/tarjetas/${id}/`, {
    method: 'PATCH',
    body: campos instanceof FormData ? campos : JSON.stringify(campos),
  })

export const obtenerEstadoPago = (id) => llamarApi(`/tarjetas/${id}/estado-pago/`)

// `clavePrivada` viaja solo en este body, nunca se loguea ni se guarda en
// estado más de lo necesario (ver ModalPago.jsx).
export const pagarTarjeta = (id, clavePrivada) =>
  llamarApi(`/tarjetas/${id}/pagar/`, {
    method: 'POST',
    body: JSON.stringify({ clave_privada: clavePrivada }),
  })

export const crearPagoFlow = (id) => llamarApi(`/tarjetas/${id}/pagar-flow/`, { method: 'POST' })
