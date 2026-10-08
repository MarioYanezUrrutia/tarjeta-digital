import React from 'react'
import PlantillaProBase from './PlantillaProBase'
import { TEMAS_PRO } from './temas'
import PlantillaSerena from './PlantillaSerena'
import PlantillaConfianza from './PlantillaConfianza'
import PlantillaVacio from './PlantillaVacio'
import PlantillaRevista from './PlantillaRevista'

// Plantillas Pro con layout propio (tanda 1): cada clave tiene su componente.
const PLANTILLAS_PROPIAS = {
  serena: PlantillaSerena,
  confianza: PlantillaConfianza,
  vacio: PlantillaVacio,
  revista: PlantillaRevista,
}

const TEMA_POR_DEFECTO = 'pro_min'

/** Resuelve qué tema Pro usar según `tarjeta.plantilla` y renderiza
 * PlantillaProBase con él. Si `plantilla` no es una de las 6 claves Pro
 * (viene vacío, o es una de las básicas A/B/C/default — tarjetas Pro
 * creadas antes de esta fase, o el valor por defecto del modelo), cae en
 * `pro_min` como piel Pro por defecto. */
export default function PlantillaProSelector({ tarjeta }) {
  const Propia = tarjeta && PLANTILLAS_PROPIAS[tarjeta.plantilla]
  if (Propia) return <Propia tarjeta={tarjeta} />
  const clave = tarjeta && TEMAS_PRO[tarjeta.plantilla] ? tarjeta.plantilla : TEMA_POR_DEFECTO
  return <PlantillaProBase tarjeta={tarjeta} tema={TEMAS_PRO[clave]} />
}
