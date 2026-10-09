import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Portada from './pages/Portada'
import PagoMercadoPagoRetorno from './pages/PagoMercadoPagoRetorno'
import Registro from './pages/Registro'
import TarjetaEditor from './pages/TarjetaEditor'
import TarjetaPublica from './pages/TarjetaPublica'

function RedireccionRaiz() {
  const { user, cargando } = useAuth()

  useEffect(guardarOrigen, [])

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
      </div>
    )
  }

  return user ? <Navigate to="/panel" replace /> : <Portada />
}

// ?o=<canal>: se guarda solo la primera vez (aún no se envía a ningún lado).
function guardarOrigen() {
  try {
    const canal = new URLSearchParams(window.location.search).get('o')
    if (canal && !localStorage.getItem('kby_origen')) {
      localStorage.setItem('kby_origen', JSON.stringify({ origen: canal, fecha: new Date().toISOString() }))
    }
  } catch {
    // localStorage puede no estar disponible (modo privado): se ignora.
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RedireccionRaiz />} />
        <Route path="/t/:slug" element={<TarjetaPublica />} />
        <Route path="/pago/mp/retorno" element={<PagoMercadoPagoRetorno />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route
          path="/panel"
          element={
            <RutaProtegida>
              <Panel />
            </RutaProtegida>
          }
        />
        <Route
          path="/panel/tarjeta/nueva"
          element={
            <RutaProtegida>
              <TarjetaEditor key="nueva" />
            </RutaProtegida>
          }
        />
        <Route
          path="/panel/tarjeta/:id"
          element={
            <RutaProtegida>
              <TarjetaEditor key="existente" />
            </RutaProtegida>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
