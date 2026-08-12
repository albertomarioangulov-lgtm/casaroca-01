import { Event } from '~~/server/models/Event'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
    .populate('ministry', 'name code color icon ageGroups')
    .populate('parentEvent', 'name status')
    .lean()

  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Eventos satélite (hijos)
  const childEvents = await Event.find({ parentEvent: id })
    .select('name date ministry type status welcomeEnabled requireWristband trackCheckOut')
    .populate('ministry', 'name code color icon ageGroups')
    .lean()

  const childEventIds = childEvents.map((c: any) => c._id.toString())
  // Resumen de check-ins del evento principal y sus satélites: total, dentro y fuera
  const allIds = [String(eventDoc._id), ...childEventIds]
  const summaries = await EventCheckIn.aggregate([
    { $match: { event: { $in: allIds } } },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        inside: { $sum: { $cond: [{ $eq: ['$checkOutTime', null] }, 1, 0] } },
        out: { $sum: { $cond: [{ $ne: ['$checkOutTime', null] }, 1, 0] } },
      },
    },
  ])
  const summaryMap = new Map(summaries.map((s: any) => [s._id.toString(), s]))
  const mainSummary = summaryMap.get(String(eventDoc._id))

  return {
    id: eventDoc._id.toString(),
    name: eventDoc.name,
    description: eventDoc.description,
    date: eventDoc.date,
    startTime: eventDoc.startTime,
    endTime: eventDoc.endTime,
    location: eventDoc.location,
    ministryId: (eventDoc.ministry as any)?._id?.toString?.() ?? (eventDoc.ministry as any)?.toString?.() ?? '',
    ministryName: (eventDoc.ministry as any)?.name ?? '',
    ageGroups: (eventDoc.ministry as any)?.ageGroups ?? [],
    parentEventId: (eventDoc.parentEvent as any)?._id?.toString?.() ?? (eventDoc.parentEvent as any)?.toString?.() ?? '',
    parentEventName: (eventDoc.parentEvent as any)?.name ?? '',
    parentEventActive: (eventDoc.parentEvent as any)?.status === 'active',
    welcomeEnabled: eventDoc.welcomeEnabled ?? true,
    requireWristband: eventDoc.requireWristband ?? false,
    trackCheckOut: eventDoc.trackCheckOut ?? false,
    ministryCode: (eventDoc.ministry as any)?.code ?? '',
    type: eventDoc.type,
    status: eventDoc.status,
    totalInside: mainSummary?.inside ?? 0,
    totalOut: mainSummary?.out ?? 0,
    childEvents: childEvents.map((c: any) => {
      const summary = summaryMap.get(c._id.toString())
      return {
        id: c._id.toString(),
        name: c.name,
        status: c.status,
        ministryId: (c.ministry as any)?._id?.toString?.() ?? (c.ministry as any)?.toString?.() ?? '',
        ministryName: (c.ministry as any)?.name ?? '',
        ministryColor: (c.ministry as any)?.color ?? '',
        ministryIcon: (c.ministry as any)?.icon ?? '',
        date: c.date,
        ageGroups: (c.ministry as any)?.ageGroups ?? [],
        welcomeEnabled: c.welcomeEnabled ?? true,
        requireWristband: c.requireWristband ?? false,
        trackCheckOut: c.trackCheckOut ?? false,
        checkInCount: summary?.count ?? 0,
        totalInside: summary?.inside ?? 0,
        totalOut: summary?.out ?? 0,
      }
    }),
    createdAt: eventDoc.createdAt,
    updatedAt: eventDoc.updatedAt,
  }
})