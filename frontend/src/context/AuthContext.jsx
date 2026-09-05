import React, { createContext, useContext, useEffect, useState } from 'react'
import { llamarApi } from '../api/cliente'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    llamarApi('/auth/me/').then(({ datos }) => {
      if (!activo) return
      setUser(datos && datos.ok ? datos.user : null)
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [])

  async function login(username, password) {
    const { datos } = await llamarApi('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (datos && datos.ok) {
      setUser(datos.user)
      return { ok: true }
    }
    return { ok: false, error: (datos && datos.error) || 'No se pudo iniciar sesión.' }
  }

  async function registro(campos) {
    const { datos } = await llamarApi('/auth/registro/', {
      method: 'POST',
      body: JSON.stringify(campos),
    })
    if (datos && datos.ok) {
      return { ok: true, message: datos.message }
    }
    return {
      ok: false,
      errors: (datos && datos.errors) || null,
      error: (datos && datos.error) || 'No se pudo completar el registro.',
    }
  }

  async function logout() {
    await llamarApi('/auth/logout/', { method: 'POST' })
    setUser(null)
  }

  // Login-2b (Google) se agrega acá después: una función del tipo
  // loginConGoogle(tokenGoogle) que llame a POST /auth/google/ con el mismo
  // patrón que login() — ya guarda `user` en el mismo estado.

  const value = { user, cargando, login, registro, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return contexto
}
