/**
 * Utilidades de búsqueda por términos (tokenizada).
 *
 * Resuelve el problema de buscar nombres completos por partes:
 * - "Alberto Mario Angulo Villanueva"  → buscar "Alberto Angulo" SÍ lo encuentra
 * - "María Fernanda López Pérez"       → buscar "López María" SÍ lo encuentra
 *
 * La lógica divide el texto en palabras y requiere que TODAS las palabras
 * coincidan (en cualquier posición y orden) en al menos uno de los campos.
 */

// Escapa caracteres especiales de regex para evitar inyección de patrones
export const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Construye un filtro MongoDB de búsqueda por términos.
 *
 * @param search  - Texto de búsqueda crudo (ej. "Alberto Angulo")
 * @param fields  - Campos sobre los cuales buscar (ej. ['name', 'phone', 'email'])
 * @param opts    - Opciones: minTokenLength (mínimo de caracteres por término)
 * @returns       - Un filtro para MongoDB o null si no hay búsqueda
 */
export const buildSearchFilter = (
  search: string,
  fields: string[],
  opts: { minTokenLength?: number } = {}
): Record<string, any> | null => {
  const minTokenLength = opts.minTokenLength ?? 2

  const rawTokens = search
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  // Conservar tokens con 1 solo carácter (ej. iniciales "A Angulo") pero
  // filtrar tokens que no aportan información (artículos, preposiciones, etc.)
  const stopWords = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'un', 'una',
    'unos', 'unas', 'al', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre',
  ])

  const tokens = rawTokens.filter((t) => {
    if (stopWords.has(t.toLowerCase())) return false
    if (t.length >= minTokenLength) return true
    // Permite tokens de 1 carácter solo si son letras (iniciales)
    return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]$/.test(t)
  })

  if (tokens.length === 0) return null

  // Cada término DEBE aparecer en al menos uno de los campos.
  // Ej: "Alberto Angulo" → name contiene "alberto" Y name contiene "angulo"
  // (el orden no importa, lo que está en medio no importa)
  const andConditions = tokens.map((token) => {
    const escaped = escapeRegex(token)
    const fieldConditions = fields.map((field) => ({
      [field]: { $regex: escaped, $options: 'i' },
    }))
    return { $or: fieldConditions }
  })

  return { $and: andConditions }
}

/**
 * Variante en memoria para datos ya cargados (ej. checkins).
 * Retorna una función que evalúa si un objeto coincide con la búsqueda.
 *
 * @param search - Texto de búsqueda crudo
 * @param getValues - Función que extrae los valores a buscar de cada item
 */
export const makeInMemorySearch = (
  search: string,
  getValues: (item: any) => string[],
  opts: { minTokenLength?: number } = {}
): ((item: any) => boolean) | null => {
  const minTokenLength = opts.minTokenLength ?? 2

  const rawTokens = search
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  const stopWords = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'un', 'una',
    'unos', 'unas', 'al', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre',
  ])

  const tokens = rawTokens.filter((t) => {
    if (stopWords.has(t.toLowerCase())) return false
    if (t.length >= minTokenLength) return true
    return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]$/.test(t)
  })

  if (tokens.length === 0) return null

  const lowercaseTokens = tokens.map((t) => t.toLowerCase())

  return (item: any) => {
    const values = getValues(item).map((v) => v.toLowerCase())
    // Todos los términos deben aparecer en al menos un valor
    return lowercaseTokens.every((token) =>
      values.some((v) => v.includes(token))
    )
  }
}