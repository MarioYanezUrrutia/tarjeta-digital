import React from 'react'
import { PROMOS_ECOSISTEMA } from '../constants/promos'

// Venta cruzada amable, no publicidad invasiva: va debajo de las tarjetas
// del usuario, nunca antes — el flujo principal (crear/editar) sigue siendo
// lo primero que se ve.
export default function PromosEcosistema() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Descubre el ecosistema Kabymur</h2>
        <p className="text-xs text-gray-500">Otras herramientas que pueden servirte.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROMOS_ECOSISTEMA.map((promo) => (
          <a
            key={promo.titulo}
            href={promo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden="true">
              {promo.icono}
            </span>
            <p className="font-medium text-gray-900">{promo.titulo}</p>
            <p className="text-sm text-gray-500">{promo.descripcion}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
