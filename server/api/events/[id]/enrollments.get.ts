import { Event } from '~~/server/models/Event'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ENROLLMENTS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const query = getQuery(event)
  const status = (query.status as string) || 'registered'

  const filter: Record<string, any> = { event: eventDoc._id }
  if (status) filter.status = status

  const enrollments = await EventEnrollment.find(filter)
    .populate('person', 'name birthDate')
    .populate('enrolledBy', 'name phone')
    .sort({ registeredAt: 1 })
    .lean()

  return {
    items: enrollments.map((e: any) => ({
      id: e._id.toString(),
      eventId: id,
      personId: e.person?._id?.toString?.() ?? e.person?.toString?.() ?? '',
      personName: e.person?.name ?? '',
      personBirthDate: e.person?.birthDate ?? null,
      enrolledById: e.enrolledBy?._id?.toString?.() ?? e.enrolledBy?.toString?.() ?? '',
      enrolledByName: e.enrolledBy?.name ?? '',
      enrolledByPhone: e.enrolledBy?.phone ?? '',
      status: e.status,
      registeredAt: e.registeredAt,
      createdAt: e.createdAt,
    })),
    total: enrollments.length,
  }
})