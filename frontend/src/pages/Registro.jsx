import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BotonGoogle from '../components/BotonGoogle'

const CAMPOS_INICIALES = {
  username: '',
  email: '',
  password: '',
  password_confirm: '',
  primer_nombre: '',
  apellido_paterno: '',
  cod_tel_pais_wp: '56',
  cod_tel_wp: '',
  whatsapp_persona: '',
}

function Campo({ label, value, onChange, error, type = 'text', required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
          error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Registro() {
  const { registro, loginConGoogle } = useAuth()
  const navigate = useNavigate()
  const [campos, setCampos] = useState(CAMPOS_INICIALES)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState('')

  async function onGoogleExito(tokenGoogle) {
    setErrorGeneral('')
    const resultado = await loginConGoogle(tokenGoogle)
    if (resultado.ok) {
      navigate('/panel')
    } else {
      setErrorGeneral(resultado.error)
    }
  }

  function actualizar(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setErrores({})
    setErrorGeneral('')
    setEnviando(true)

    const resultado = await registro(campos)
    setEnviando(false)

    if (resultado.ok) {
      setExito(resultado.message || 'Cuenta creada. Ya puedes iniciar sesión.')
      setTimeout(() => navigate('/login'), 1500)
      return
    }

    if (resultado.errors) {
      const planos = {}
      for (const [campo, mensajes] of Object.entries(resultado.errors)) {
        planos[campo] = Array.isArray(mensajes) ? mensajes.join(' ') : String(mensajes)
      }
      setErrores(planos)
    } else {
      setErrorGeneral(resultado.error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Crear cuenta</h1>

        {exito ? (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{exito}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Campo
              label="Nombre"
              value={campos.primer_nombre}
              onChange={(v) => actualizar('primer_nombre', v)}
              error={errores.primer_nombre}
              required
            />
            <Campo
              label="Apellido"
              value={campos.apellido_paterno}
              onChange={(v) => actualizar('apellido_paterno', v)}
              error={errores.apellido_paterno}
              required
            />
            <Campo
              label="Usuario"
              value={campos.username}
              onChange={(v) => actualizar('username', v)}
              error={errores.username}
              required
            />
            <Campo
              label="Correo"
              type="email"
              value={campos.email}
              onChange={(v) => actualizar('email', v)}
              error={errores.email}
              required
            />
            <Campo
              label="Contraseña"
              type="password"
              value={campos.password}
              onChange={(v) => actualizar('password', v)}
              error={errores.password}
              required
            />
            <Campo
              label="Confirmar contraseña"
              type="password"
              value={campos.password_confirm}
              onChange={(v) => actualizar('password_confirm', v)}
              error={errores.password_confirm}
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                WhatsApp (opcional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="56"
                  value={campos.cod_tel_pais_wp}
                  onChange={(e) => actualizar('cod_tel_pais_wp', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="9"
                  value={campos.cod_tel_wp}
                  onChange={(e) => actualizar('cod_tel_wp', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="12345678"
                  value={campos.whatsapp_persona}
                  onChange={(e) => actualizar('whatsapp_persona', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              {errores.whatsapp_persona && (
                <p className="mt-1 text-xs text-red-600">{errores.whatsapp_persona}</p>
              )}
            </div>

            {errorGeneral && <p className="text-sm text-red-600">{errorGeneral}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {!exito && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
              <hr className="flex-1 border-gray-200" /> o <hr className="flex-1 border-gray-200" />
            </div>
            <BotonGoogle etiqueta="Registrarse con Google" onExito={onGoogleExito} onError={setErrorGeneral} />
          </>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-gray-900 underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
