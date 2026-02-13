export const STORE_CATEGORIES = [
  'Comida',
  'Estilo de vida',
  'Mercado',
  'Licores',
  'Salud y bienestar',
  'Mascotas',
  'Hogar y Jardín',
  'Tecnología',
  'Entretenimiento',
  'Servicios',
] as const

export type StoreCategory = (typeof STORE_CATEGORIES)[number]
