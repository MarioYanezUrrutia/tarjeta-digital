import React from 'react'
import { IconPin, IconUser, IconMap, IconContactCard } from './icons'
import { iniciales, useDatosTarjeta } from './useDatosTarjeta'

function BotonAccion({ href, Icon, label, valor }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="flex w-full items-center gap-3 rounded-[9px] border border-[#dfe2e5] bg-white px-4 py-3 text-[#22262b] transition hover:bg-[#f6f7f8]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#9aa0a6]">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="text-sm font-medium">{label}</span>
        {valor && <span className="w-full truncate text-xs text-[#8a9096]">{valor}</span>}
      </span>
    </a>
  )
}

export default function PlantillaA({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, profesion, empresa, eslogan,
    sobre_texto, direccion, horario, mostrar_sobre,
    productos,
  } = tarjeta

  const { contactos, redes, mostrarUbicacionSeccion, mostrarProductosSeccion } = useDatosTarjeta(tarjeta)

  return (
    <div className="min-h-screen bg-white text-[#22262b]" style={{ fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-10">
        <header className="flex flex-col items-center text-center">
          {imagen ? (
            <img
              src={imagen}
              alt={nombre_mostrado || ''}
              className="h-40 w-40 rounded-full border border-[#d7dade] object-cover"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full border border-[#d7dade] bg-[#f6f7f8] text-4xl font-medium text-[#6b7177]">
              {iniciales(nombre_mostrado)}
            </div>
          )}
          <h1 className="mt-4 text-[22px] font-medium">{nombre_mostrado}</h1>
          {(profesion || cargo_rubro || empresa) && (
            <p className="text-sm text-[#6b7177]">
              {[profesion, cargo_rubro, empresa].filter(Boolean).join(' · ')}
            </p>
          )}
          {eslogan && <p className="mt-2 text-sm text-[#8a9096]">{eslogan}</p>}
        </header>

        <hr className="border-t border-[#eceef0]" />

        {contactos.length > 0 && (
          <section className="flex flex-col gap-3">
            {contactos.map((c) => (
              <BotonAccion key={c.key} href={c.href} Icon={c.Icon} label={c.label} valor={c.valor} />
            ))}
          </section>
        )}

        {redes.length > 0 && (
          <section className="flex flex-col gap-3">
            {redes.map((r) => (
              <BotonAccion key={r.key} href={r.href} Icon={r.Icon} label={r.label} />
            ))}
          </section>
        )}

        {/* TODO: generar y descargar archivo .vcf real con los datos de la tarjeta */}
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-[9px] bg-[#1a1d21] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#2a2e33]"
        >
          <IconContactCard />
          Guardar contacto
        </button>

        {mostrar_sobre && sobre_texto && (
          <section className="rounded-xl border border-[#eceef0] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1a1d21]">
              <IconUser /> Sobre {tarjeta.tipo === 'negocio' ? 'nosotros' : 'mí'}
            </h2>
            <p className="text-sm leading-relaxed text-[#6b7177]">{sobre_texto}</p>
          </section>
        )}

        {mostrarUbicacionSeccion && (
          <section className="rounded-xl border border-[#eceef0] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-[#1a1d21]">
              <IconPin /> Ubicación
            </h2>
            {direccion && <p className="text-sm text-[#22262b]">{direccion}</p>}
            {horario && <p className="text-sm text-[#8a9096]">{horario}</p>}
            {direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-[9px] bg-[#1a1d21] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2e33]"
              >
                <IconMap /> Cómo llegar
              </a>
            )}
          </section>
        )}

        {mostrarProductosSeccion && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[#1a1d21]">Productos y servicios</h2>
            {productos.map((p) => (
              <div key={p.orden + p.nombre} className="flex gap-3 rounded-xl border border-[#eceef0] p-3">
                {p.imagen && (
                  <img src={p.imagen} alt={p.nombre} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nombre}</p>
                  {p.caracteristicas && (
                    <p className="text-xs text-[#8a9096]">{p.caracteristicas}</p>
                  )}
                  {p.detalle && (
                    <p className="mt-1 text-xs text-[#6b7177]">{p.detalle}</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
