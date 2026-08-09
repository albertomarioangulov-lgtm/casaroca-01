// ============================================================
// Tarjeta de Conexión - Ministerio de Bienvenida (Nicodemo)
// Constantes compartidas (frontend + backend)
// ============================================================

// Sedes de Casa Sobre la Roca / Casa Roca
export const CHURCH_CAMPUSES = [
  'Armenia',
  'Bogotá',
  'Bucaramanga',
  'Cali',
  'Cartagena',
  'Cúcuta',
  'Florencia',
  'Garzón',
  'Girardot',
  'Ibagué',
  'Llanogrande ANT',
  'Manizales',
  'Medellín',
  'Montería',
  'Neiva',
  'Pasto',
  'Pereira',
  'Popayán',
  'Sabana Norte',
  'Santa Marta',
  'Sincelejo',
  'Sogamoso',
  'Tunja',
  'Valledupar',
  'Villavicencio',
  'Yopal',
  'Barcelona',
  'Madrid',
  'Boca Ratón',
  'Miami',
  'Orlando',
  'Ciudad de Panamá',
  'Ottawa Canadá',
] as const

export type ChurchCampus = (typeof CHURCH_CAMPUSES)[number]

// Tipología del visitante
export const VISITOR_TYPES = [
  { title: 'Es mi primera vez', value: 'first_time' },
  { title: 'Actualizar mi información', value: 'update_info' },
] as const

export type VisitorType = (typeof VISITOR_TYPES)[number]['value']

// Motivación para visitar la iglesia
export const VISIT_MOTIVATIONS = [
  { title: 'Programa de TV H&C', value: 'tv_program' },
  { title: 'Invitación', value: 'invitation' },
  { title: 'Revista H&C', value: 'magazine' },
  { title: 'Redes Sociales', value: 'social_media' },
  { title: 'Otros', value: 'other' },
] as const

export type VisitMotivation = (typeof VISIT_MOTIVATIONS)[number]['value']

// ¿Interesado en más información?
export const CONNECTION_INTEREST = [
  { title: 'Me encantaría que Casa Roca sea mi casa', value: 'casa_roca_home' },
  { title: 'Solo estoy de visita', value: 'just_visiting' },
] as const

export type ConnectionInterest = (typeof CONNECTION_INTEREST)[number]['value']

// Grupos de afinidad (grupos pequeños)
export const AFFINITY_GROUPS = [
  { title: 'Años Dorados', value: 'anios_dorados' },
  { title: 'Casa2', value: 'casa2' },
  { title: 'Hombres de Bien', value: 'hombres_de_bien' },
  { title: 'J25', value: 'j25' },
  { title: 'Mujer Integral', value: 'mujer_integral' },
  { title: 'tMt', value: 'tmt' },
] as const

export type AffinityGroup = (typeof AFFINITY_GROUPS)[number]['value']

// Intereses de seguimiento
export const FOLLOW_UP_INTERESTS = [
  { title: 'Unirme a un grupo pequeño', value: 'small_group' },
  { title: 'Orientación Espiritual', value: 'spiritual_guidance' },
  { title: 'Proceso de Crecimiento', value: 'growth_process' },
  { title: 'Bautizarme', value: 'baptism' },
] as const

export type FollowUpInterest = (typeof FOLLOW_UP_INTERESTS)[number]['value']

// Origen del registro (servicio o actividad)
export const REGISTRATION_ORIGINS = [
  'AMEC',
  'Años Dorados',
  'Ayuno',
  'Casa2',
  'Conexión',
  'Deportistas Cristianos',
  'Evento Especial',
  'Hombres de Bien',
  'J25',
  'Mujer Integral',
  'Otra Casa Roca',
  'Servicio de Domingos',
  'Servicio de Miércoles',
  'tMt',
] as const

export type RegistrationOrigin = (typeof REGISTRATION_ORIGINS)[number]