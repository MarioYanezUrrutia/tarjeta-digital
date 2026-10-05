import { llamarApi } from './cliente'

export const obtenerMisTarjetas = () => llamarApi('/mis-tarjetas/')

// `campos`: datos iniciales de la tarjeta (el editor la crea al primer Guardar).
export const crearTarjeta = (campos = {}) =>
  llamarApi('/tarjetas/', { method: 'POST', body: JSON.stringify(campos) })

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

export const crearPagoMercadoPago = (id, plan) =>
  llamarApi(`/tarjetas/${id}/pagar-mp/`, { method: 'POST', body: JSON.stringify({ plan }) })

export const obtenerPlanesPro = (id) => llamarApi(`/tarjetas/${id}/planes-pro/`)

export const obtenerCuposFundador = () => llamarApi('/cupos-fundador/')

export const borrarTarjeta = (id) => llamarApi(`/tarjetas/${id}/`, { method: 'DELETE' })

export const obtenerLandingPro = () => llamarApi('/panel/landing-pro/')

export const crearLandingPro = () => llamarApi('/panel/landing-pro/crear/', { method: 'POST' })

export const verificarPagoMercadoPago = (id, ref) =>
  llamarApi(`/tarjetas/${id}/verificar-pago-mp/`, { method: 'POST', body: JSON.stringify({ ref }) })
