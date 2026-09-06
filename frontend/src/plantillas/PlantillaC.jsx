import React from 'react'
import { IconPin, IconUser, IconMap, IconContactCard } from './icons'
import { iniciales, useDatosTarjeta } from './useDatosTarjeta'

function BotonAccion({ href, Icon, label, valor }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="flex items-center gap-3 w-full rounded-xl bg-[#21242e] px-4 py-3 text-white transition hover:bg-[#282c38] hover:ring-1 hover:ring-[#2dd4bf]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2dd4bf1a] text-[#2dd4bf]">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="text-sm font-medium">{label}</span>
        {valor && <span className="w-full truncate text-xs text-gray-400">{valor}</span>}
      </span>
    </a>
  )
}

export default function PlantillaC({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, profesion, empresa, eslogan,
    sobre_texto, direccion, horario, mostrar_sobre,
    productos,
  } = tarjeta

  const { contactos, redes, mostrarUbicacionSeccion, mostrarProductosSeccion } = useDatosTarjeta(tarjeta)

  return (
    <div className="min-h-screen bg-[#16181f] text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-10">
        <header className="flex flex-col items-center text-center">
          {imagen ? (
            <img
              src={imagen}
              alt={nombre_mostrado || ''}
              className="h-32 w-32 rounded-full border-2 border-[#2dd4bf] object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#2dd4bf] bg-[#21242e] text-3xl font-semibold text-[#2dd4bf]">
              {iniciales(nombre_mostrado)}
            </div>
          )}
          <h1 className="mt-4 text-xl font-semibold">{nombre_mostrado}</h1>
          {(profesion || cargo_rubro || empresa) && (
            <p className="text-sm text-gray-300">
              {[profesion, cargo_rubro, empresa].filter(Boolean).join(' · ')}
            </p>
          )}
          {eslogan && <p className="mt-2 text-sm italic text-gray-400">{eslogan}</p>}
        </header>

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
          className="flex items-center justify-center gap-2 rounded-xl border border-[#2dd4bf] px-4 py-3 text-sm font-medium text-[#2dd4bf] transition hover:bg-[#2dd4bf1a]"
        >
          <IconContactCard />
          Guardar contacto
        </button>

        {mostrar_sobre && sobre_texto && (
          <section className="rounded-xl bg-[#21242e] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2dd4bf]">
              <IconUser /> Sobre {tarjeta.tipo === 'negocio' ? 'nosotros' : 'mí'}
            </h2>
            <p className="text-sm leading-relaxed text-gray-300">{sobre_texto}</p>
          </section>
        )}

        {mostrarUbicacionSeccion && (
          <section className="rounded-xl bg-[#21242e] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2dd4bf]">
              <IconPin /> Ubicación
            </h2>
            {direccion && <p className="text-sm text-gray-300">{direccion}</p>}
            {horario && <p className="text-sm text-gray-400">{horario}</p>}
            {direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#16181f] transition hover:bg-[#25b8a5]"
              >
                <IconMap /> Cómo llegar
              </a>
            )}
          </section>
        )}

        {mostrarProductosSeccion && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-[#2dd4bf]">Productos y servicios</h2>
            {productos.map((p) => (
              <div key={p.orden + p.nombre} className="flex gap-3 rounded-xl bg-[#21242e] p-3">
                {p.imagen && (
                  <img src={p.imagen} alt={p.nombre} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nombre}</p>
                  {p.caracteristicas && (
                    <p className="text-xs text-gray-400">{p.caracteristicas}</p>
                  )}
                  {p.detalle && (
                    <p className="mt-1 text-xs text-gray-300">{p.detalle}</p>
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
