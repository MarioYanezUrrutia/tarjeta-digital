import React from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { GOOGLE_CONFIGURADO } from '../config/google'

function IconoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3c-7.7 0-14.3 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 45c5.5 0 10.3-1.8 14.1-5l-6.5-5.5c-2 1.4-4.6 2.3-7.6 2.3-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 40.5 16.2 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.9 35.9 45 30.5 45 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  )
}

const CLASES_BOTON =
  'flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

// Con VITE_GOOGLE_CLIENT_ID configurado: botón real. `useGoogleLogin` (flujo
// implícito, el default) dispara el popup de OAuth de Google y entrega un
// ACCESS TOKEN válido para /oauth2/v3/userinfo — es el tipo de token que
// espera Banexa en POST /auth/google/ (Banexa hace GET userinfo con ese
// token, no decodifica un id_token/credential). Por eso se usa useGoogleLogin
// y NO el componente <GoogleLogin> de One Tap, que entrega un credential/
// id_token que Banexa no sabe validar.
function BotonGoogleActivo({ etiqueta, onExito, onError }) {
  const iniciarSesionGoogle = useGoogleLogin({
    onSuccess: (respuesta) => onExito(respuesta.access_token),
    onError: () => onError('No se pudo iniciar sesión con Google.'),
  })

  return (
    <button type="button" onClick={() => iniciarSesionGoogle()} className={CLASES_BOTON}>
      <IconoGoogle />
      {etiqueta}
    </button>
  )
}

// Sin VITE_GOOGLE_CLIENT_ID: placeholder deshabilitado, SIN llamar a
// useGoogleLogin — el SDK de Google lanza una excepción síncrona ("Missing
// required parameter client_id") apenas ese hook intenta inicializar el
// cliente OAuth con un client_id vacío, y esa excepción tumba toda la
// pantalla (React desmonta el árbol completo). Mantener este botón en un
// componente aparte, que nunca llama al hook, evita el problema de raíz.
function BotonGoogleDeshabilitado({ etiqueta }) {
  return (
    <button
      type="button"
      disabled
      title="Falta configurar VITE_GOOGLE_CLIENT_ID en frontend/.env"
      className={CLASES_BOTON}
    >
      <IconoGoogle />
      {etiqueta}
    </button>
  )
}

export default function BotonGoogle({ etiqueta = 'Continuar con Google', onExito, onError }) {
  if (!GOOGLE_CONFIGURADO) {
    return <BotonGoogleDeshabilitado etiqueta={etiqueta} />
  }
  return <BotonGoogleActivo etiqueta={etiqueta} onExito={onExito} onError={onError} />
}
