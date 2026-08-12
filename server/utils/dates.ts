/**
 * Convierte "YYYY-MM-DD" (fecha de calendario sin hora) a un Date inmune a
 * desfases de zona horaria. Usa mediodía UTC (T12:00:00.000Z): cualquier zona
 * horaria real (UTC-12 a UTC+14) mostrará el mismo día calendario.
 * Ej: "1982-07-08" → 1982-07-08T12:00:00.000Z (siempre se ve como 8 de julio)
 * Retorna undefined si el valor es vacío.
 */
export const parseDateOnly = (date: string | null | undefined): Date | undefined => {
  if (!date) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  return new Date(`${date}T12:00:00.000Z`)
}

/**
 * Convierte YYYY-MM-DD al inicio del día en Colombia (UTC-5) como Date UTC.
 * Útil para filtros de rango de fechas con $gte en MongoDB.
 * Ej: "2026-07-29" → 2026-07-29T05:00:00.000Z (medianoche Colombia)
 */
export const getStartOfDay = (date: string): Date => {
  return new Date(`${date}T05:00:00.000Z`)
}

/**
 * Convierte YYYY-MM-DD al último milisegundo del día en Colombia (UTC-5) como Date UTC.
 * Útil para filtros de rango de fechas con $lte en MongoDB.
 * Ej: "2026-07-29" → 2026-07-30T04:59:59.999Z (11:59:59pm Colombia)
 */
export const getEndOfDay = (date: string): Date => {
  const endDate = new Date(`${date}T05:00:00.000Z`)
  endDate.setUTCDate(endDate.getUTCDate() + 1)
  endDate.setUTCMilliseconds(-1)
  return endDate
}