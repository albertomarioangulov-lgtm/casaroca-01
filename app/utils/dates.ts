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
 */
export const formatDateInput = (value: any): string => {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}