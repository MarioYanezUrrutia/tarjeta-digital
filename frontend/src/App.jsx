import React from 'react'
import { Route, Routes } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Registro from './pages/Registro'
import TarjetaPublica from './pages/TarjetaPublica'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/t/:slug" element={<TarjetaPublica />} />
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
      </Routes>
    </AuthProvider>
  )
}
