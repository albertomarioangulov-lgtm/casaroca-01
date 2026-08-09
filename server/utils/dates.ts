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
