import { llamarApi } from './cliente'

export const obtenerMisTarjetas = () => llamarApi('/mis-tarjetas/')

export const crearTarjeta = () => llamarApi('/tarjetas/', { method: 'POST' })

export const obtenerTarjeta = (id) => llamarApi(`/tarjetas/${id}/`)

export const actualizarTarjeta = (id, campos) =>
  llamarApi(`/tarjetas/${id}/`, { method: 'PATCH', body: JSON.stringify(campos) })
