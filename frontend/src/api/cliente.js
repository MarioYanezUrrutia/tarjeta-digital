const API_BASE = import.meta.env.VITE_API_BASE

// Todas las llamadas al backend de tarjeta-digital van con
// credentials:'include' — la cookie httpOnly de sesión (banexa_token) vive
// en el backend (8010), en un origen distinto al del frontend (5173), y sin
// esto el navegador ni la manda ni la guarda.
export async function llamarApi(path, options = {}) {
  const respuesta = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let datos = null
  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }
  return { status: respuesta.status, datos }
}
