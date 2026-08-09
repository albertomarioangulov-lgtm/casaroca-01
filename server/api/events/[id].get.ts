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
    .populate('ministry', 'name code color icon')
    .populate('parentEvent', 'name status')
    .lean()

  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Eventos satélite (hijos)
  const childEvents = await Event.find({ parentEvent: id })
    .select('name date ministry type status')
    .populate('ministry', 'name code color icon')
    .lean()

  const childEventIds = childEvents.map((c: any) => c._id.toString())
  const checkInCounts = await EventCheckIn.aggregate([
    { $match: { event: { $in: childEventIds } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ])
  const countMap = new Map(checkInCounts.map((c: any) => [c._id.toString(), c.count]))

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
    parentEventId: (eventDoc.parentEvent as any)?._id?.toString?.() ?? (eventDoc.parentEvent as any)?.toString?.() ?? '',
    parentEventName: (eventDoc.parentEvent as any)?.name ?? '',
    parentEventActive: (eventDoc.parentEvent as any)?.status === 'active',
    welcomeEnabled: eventDoc.welcomeEnabled ?? true,
    type: eventDoc.type,
    status: eventDoc.status,
    childEvents: childEvents.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      status: c.status,
      ministryId: (c.ministry as any)?._id?.toString?.() ?? (c.ministry as any)?.toString?.() ?? '',
      ministryName: (c.ministry as any)?.name ?? '',
      ministryColor: (c.ministry as any)?.color ?? '',
      ministryIcon: (c.ministry as any)?.icon ?? '',
      date: c.date,
      checkInCount: countMap.get(c._id.toString()) ?? 0,
    })),
    createdAt: eventDoc.createdAt,
    updatedAt: eventDoc.updatedAt,
  }
})
