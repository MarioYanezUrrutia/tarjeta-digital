import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Panel() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const nombre = user?.nombre_preferido || user?.nombre_completo?.trim() || user?.username

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow">
        <h1 className="text-xl font-semibold text-gray-900">Hola, {nombre}</h1>
        <p className="mt-2 text-sm text-gray-500">
          Panel de prueba — el formulario real de tu tarjeta llega en una tarea futura.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-6 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
