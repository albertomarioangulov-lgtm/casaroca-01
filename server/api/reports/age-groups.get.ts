import { Event } from '~~/server/models/Event'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

// Reporte de asistencia por rango de edad / salón para un período.
// Usa la fecha del check-in y el snapshot de rangos del EVENTO (histórico fiel).
export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHECKINS_READ)

  const query = getQuery(event)
  const desde = query.desde as string | undefined
  const hasta = query.hasta as string | undefined
  const ministryId = query.ministryId as string | undefined
  const granularity = (query.granularity as string) || 'total' // 'total' | 'mensual'

  // Rango de fechas (por defecto: últimos 6 meses)
  const now = new Date()
  const toDate = hasta ? new Date(hasta) : new Date(now)
  const fromDate = desde ? new Date(desde) : new Date(now.getFullYear(), now.getMonth() - 6, 1)
  if (isNaN(toDate.getTime()) || isNaN(fromDate.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Fechas inválidas para el reporte' })
  }

  // Buscar eventos en el período
  const eventsByDate = await Event.find(
    { date: { $gte: fromDate, $lte: toDate } },
    { _id: 1, date: 1, ministry: 1, ageGroupsSnapshot: 1 }
  ).lean()

  if (ministryId) {
    // filter en memoria para consistencia: los eventos tienen ministry como ObjectId
    const filtered = eventsByDate.filter((e: any) =>
      e.ministry?.toString?.() === ministryId || e.ministry === ministryId
    )
    eventsByDate.length = 0
    eventsByDate.push(...filtered)
  }

  const eventIds = eventsByDate.map((e: any) => e._id)
  if (eventIds.length === 0) {
    return { total: [], mensual: [], eventos: 0 }
  }

  const checkIns = await EventCheckIn.find({
    event: { $in: eventIds },
    checkInTime: { $gte: fromDate, $lte: toDate },
  }).select('event person checkInTime ageGroupIndex').lean()

  // Mapa evento -> snapshot de rangos
  const eventsMap = new Map<string, any>()
  for (const e of eventsByDate) {
    const snap = (e as any).ageGroupsSnapshot?.length ? (e as any).ageGroupsSnapshot : []
    eventsMap.set(e._id.toString(), snap)
  }

  // Resolver salón de cada check-in
  const resolveGroup = (ci: any) => {
    const snap = eventsMap.get(ci.event?.toString?.() ?? '') ?? []
    const idx = ci.ageGroupIndex
    if (idx !== undefined && idx >= 0 && snap[idx]) {
      const g = snap[idx]
      return { name: g.name || 'Grupo', minAge: g.minAge ?? null, maxAge: g.maxAge ?? null }
    }
    return { name: 'Sin grupo', minAge: null, maxAge: null }
  }

  // Agregación total (para torta)
  const totalMap = new Map<string, { name: string; minAge: number | null; maxAge: number | null; cantidad: number }>()
  // Agregación mensual (para barras)
  const monthlyMap = new Map<string, Map<string, { name: string; minAge: number | null; maxAge: number | null; cantidad: number }>>()

  for (const ci of checkIns) {
    const g = resolveGroup(ci)
    const key = g.name || 'Sin grupo'

    const totalEntry = totalMap.get(key) || { name: key, minAge: g.minAge, maxAge: g.maxAge, cantidad: 0 }
    totalEntry.cantidad++
    totalMap.set(key, totalEntry)

    const mesKey = ci.checkInTime ? `${ci.checkInTime.getFullYear()}-${String(ci.checkInTime.getMonth() + 1).padStart(2, '0')}` : 'sin-fecha'
    if (!monthlyMap.has(mesKey)) monthlyMap.set(mesKey, new Map())
    const monthMap = monthlyMap.get(mesKey)!
    const monthEntry = monthMap.get(key) || { name: key, minAge: g.minAge, maxAge: g.maxAge, cantidad: 0 }
    monthEntry.cantidad++
    monthMap.set(key, monthEntry)
  }

  const total = Array.from(totalMap.values()).sort((a, b) => (a.minAge ?? 0) - (b.minAge ?? 0))
  const mensual = granularity === 'mensual'
    ? Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, rangos]) => ({
          mes,
          rangos: Array.from(rangos.values()).sort((a, b) => (a.minAge ?? 0) - (b.minAge ?? 0)),
        }))
    : []

  return {
    total,
    mensual,
    eventos: eventIds.length,
    desde: fromDate,
    hasta: toDate,
  }
})