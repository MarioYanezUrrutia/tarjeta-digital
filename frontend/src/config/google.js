// Client ID de Google OAuth (Google Cloud Console) — lo pone cada dev/entorno
// en su propio frontend/.env como VITE_GOOGLE_CLIENT_ID (ver .env.example).
// Sin él, el botón de Google igual se renderiza (queda deshabilitado) para no
// romper el resto del login/registro.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
export const GOOGLE_CONFIGURADO = Boolean(GOOGLE_CLIENT_ID)
