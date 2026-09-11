import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Panel from './pages/Panel'
import PagoFlowRetorno from './pages/PagoFlowRetorno'
import Registro from './pages/Registro'
import TarjetaEditor from './pages/TarjetaEditor'
import TarjetaPublica from './pages/TarjetaPublica'

function RedireccionRaiz() {
  const { user, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
      </div>
    )
  }

  return <Navigate to={user ? '/panel' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RedireccionRaiz />} />
        <Route path="/t/:slug" element={<TarjetaPublica />} />
        <Route path="/pago/flow/retorno" element={<PagoFlowRetorno />} />
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
          path="/panel/tarjeta/:id"
          element={
            <RutaProtegida>
              <TarjetaEditor />
            </RutaProtegida>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
