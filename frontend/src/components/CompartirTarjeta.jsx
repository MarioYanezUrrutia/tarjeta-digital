import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

// Sin VITE_PUBLIC_BASE_URL (producción todavía no configurada, o dev sin
// .env completo) cae al origen actual del navegador — nunca se rompe, solo
// podría no ser la URL pública real si el editor no vive en ese dominio.
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin

const TAMANO_PANTALLA_PX = 200
const TAMANO_DESCARGA_PX = 512

export default function CompartirTarjeta({ slug, estado }) {
  const canvasRef = useRef(null)
  const [copiado, setCopiado] = useState(false)
  const url = `${PUBLIC_BASE_URL}/t/${slug}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: TAMANO_PANTALLA_PX, margin: 1 })
    }
  }, [url])

  async function onCopiarEnlace() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Clipboard API puede no estar disponible (navegador viejo, contexto
      // sin HTTPS) — el enlace ya está visible en texto para copiar a mano.
    }
  }

  async function onDescargarQR() {
    const dataUrl = await QRCode.toDataURL(url, { width: TAMANO_DESCARGA_PX, margin: 2 })
    const enlace = document.createElement('a')
    enlace.href = dataUrl
    enlace.download = `qr-${slug}.png`
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {estado === 'borrador' && (
        <p className="text-center text-xs text-amber-700">Tu tarjeta se verá cuando la actives.</p>
      )}

      <canvas ref={canvasRef} className="rounded-md border border-gray-200" />

      <div className="flex w-full flex-col items-center gap-2">
        <p className="w-full truncate text-center text-sm text-gray-600">{url}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onCopiarEnlace}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {copiado ? 'Copiado ✓' : 'Copiar enlace'}
          </button>
          <button
            type="button"
            onClick={onDescargarQR}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  )
}
