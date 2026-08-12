/**
 * Convierte una fecha a string YYYY-MM-DD para enviar como parámetro en requests.
 * Retorna undefined si la fecha es inválida.
 */
export const formatDateParam = (date: string | undefined): string | undefined => {
  if (!date) return undefined
  const d = new Date(date)
  if (isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normaliza un valor de fecha (Date o string) a string YYYY-MM-DD.
 * Retorna '' si el valor es vacío o inválido.
 * Útil para manejar el valor que devuelve v-date-input (objeto Date)
 * y enviarlo como string a la API.
 * Si el valor ya es un string YYYY-MM-DD, se devuelve tal cual para
 * evitar el desfase de zona horaria al convertirlo a Date.
 */
export const formatDateInput = (value: any): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convierte un valor de fecha (Date o string) a string YYYY-MM-DD
 * para pre-cargar inputs de fecha (v-date-input, input[type=date]).
 * Usa métodos locales para no desfasarse por zona horaria.
 * Si el valor ya es un string YYYY-MM-DD, se devuelve tal cual.
 */
export const toDateInputValue = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
