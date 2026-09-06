import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { GOOGLE_CLIENT_ID } from './config/google'
import './index.css'

// clientId vacío si VITE_GOOGLE_CLIENT_ID no está configurado — el botón de
// Google igual se renderiza (deshabilitado), pero useGoogleLogin necesita
// este Provider en el árbol sí o sí para no reventar al montarse.
createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </GoogleOAuthProvider>
)
