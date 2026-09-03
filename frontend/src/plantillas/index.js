import PlantillaC from './PlantillaC'

// Mapa de plantillas disponibles por el campo `plantilla` que envía el backend.
// Por ahora solo existe la C; A y B se agregan aquí cuando estén listas,
// sin tocar la lógica de datos en pages/TarjetaPublica.jsx.
const PLANTILLAS = {
  default: PlantillaC,
  c: PlantillaC,
}

export function getPlantilla(nombre) {
  return PLANTILLAS[nombre] || PlantillaC
}
