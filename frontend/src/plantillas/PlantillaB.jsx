import React from 'react'
import { IconPin, IconUser, IconMap, IconContactCard } from './icons'
import { iniciales, useDatosTarjeta } from './useDatosTarjeta'

function BotonAccion({ href, Icon, label, valor }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="flex w-full items-center gap-3 rounded-full bg-white/[.18] px-4 py-3 text-white backdrop-blur-sm transition hover:bg-white/[.28]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="text-sm font-medium">{label}</span>
        {valor && <span className="w-full truncate text-xs text-white/70">{valor}</span>}
      </span>
    </a>
  )
}

export default function PlantillaB({ tarjeta }) {
  const {
    imagen, nombre_mostrado, cargo_rubro, profesion, empresa, eslogan,
    sobre_texto, direccion, horario, mostrar_sobre,
    productos,
  } = tarjeta

  const { contactos, redes, mostrarUbicacionSeccion, mostrarProductosSeccion } = useDatosTarjeta(tarjeta)

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'linear-gradient(150deg, #6a5cff 0%, #9b4dff 42%, #ff5c8a 100%)',
        fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-10">
        <header className="flex flex-col items-center text-center">
          {imagen ? (
            <img
              src={imagen}
              alt={nombre_mostrado || ''}
              className="h-40 w-40 rounded-full border-[3px] border-white object-cover"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-[3px] border-white bg-white/20 text-4xl font-semibold text-white">
              {iniciales(nombre_mostrado)}
            </div>
          )}
          <h1 className="mt-4 text-[23px] font-semibold">{nombre_mostrado}</h1>
          {(profesion || cargo_rubro || empresa) && (
            <p className="text-sm text-white/70">
              {[profesion, cargo_rubro, empresa].filter(Boolean).join(' · ')}
            </p>
          )}
          {eslogan && <p className="mt-2 text-sm text-white/70">{eslogan}</p>}
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
          className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#7b3ff2] transition hover:bg-white/90"
        >
          <IconContactCard />
          Guardar contacto
        </button>

        {mostrar_sobre && sobre_texto && (
          <section className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <IconUser /> Sobre {tarjeta.tipo === 'negocio' ? 'nosotros' : 'mí'}
            </h2>
            <p className="text-sm leading-relaxed text-white/90">{sobre_texto}</p>
          </section>
        )}

        {mostrarUbicacionSeccion && (
          <section className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <IconPin /> Ubicación
            </h2>
            {direccion && <p className="text-sm text-white/90">{direccion}</p>}
            {horario && <p className="text-sm text-white/70">{horario}</p>}
            {direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7b3ff2] transition hover:bg-white/90"
              >
                <IconMap /> Cómo llegar
              </a>
            )}
          </section>
        )}

        {mostrarProductosSeccion && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-white">Productos y servicios</h2>
            {productos.map((p) => (
              <div key={p.orden + p.nombre} className="flex gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                {p.imagen && (
                  <img src={p.imagen} alt={p.nombre} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{p.nombre}</p>
                  {p.caracteristicas && (
                    <p className="text-xs text-white/70">{p.caracteristicas}</p>
                  )}
                  {p.detalle && (
                    <p className="mt-1 text-xs text-white/90">{p.detalle}</p>
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
