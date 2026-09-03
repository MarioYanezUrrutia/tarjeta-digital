import PlantillaA from './PlantillaA'
import PlantillaB from './PlantillaB'
import PlantillaC from './PlantillaC'

// Mapa de plantillas disponibles por el campo `plantilla` que envía el
// backend. Valores válidos: 'A' (elegante), 'B' (moderna), 'C' (link en
// bio). 'default' se mantiene como alias de 'C' por compatibilidad con
// tarjetas creadas antes de que existiera el campo con choices. Agregar una
// plantilla nueva es sumar una entrada acá — no toca la lógica de datos en
// pages/TarjetaPublica.jsx ni useDatosTarjeta.js.
const PLANTILLAS = {
  A: PlantillaA,
  B: PlantillaB,
  C: PlantillaC,
  default: PlantillaC,
}

export function getPlantilla(nombre) {
  return PLANTILLAS[nombre] || PlantillaC
}
