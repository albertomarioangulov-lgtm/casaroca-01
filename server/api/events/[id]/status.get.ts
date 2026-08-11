import { Event } from '~~/server/models/Event'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  // Consulta ligera: solo datos de estado del evento, sin childEvents ni conteos
  const eventDoc = await Event.findById(id)
    .populate('ministry', 'name ageGroups')
    .populate('parentEvent', 'name status')
    .select('name status welcomeEnabled ministry parentEvent')
    .lean()

  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const e: any = eventDoc
  return {
    id: e._id.toString(),
    name: e.name ?? '',
    status: e.status ?? '',
    welcomeEnabled: e.welcomeEnabled ?? true,
    ministryName: e.ministry?.name ?? '',
    ageGroups: e.ministry?.ageGroups ?? [],
    parentEventId: e.parentEvent?._id?.toString?.() ?? e.parentEvent?.toString?.() ?? '',
    parentEventName: e.parentEvent?.name ?? '',
    parentEventActive: e.parentEvent?.status === 'active',
  }
})