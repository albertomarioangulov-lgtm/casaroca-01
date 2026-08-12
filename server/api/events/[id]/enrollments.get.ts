import { Event } from '~~/server/models/Event'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
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
    .populate('person', 'name birthDate phone')
    .populate('enrolledBy', 'name phone')
    .sort({ registeredAt: 1 })
    .lean()

  // Buscar si cada persona pre-inscrita ya tiene check-in en este evento
  const personIds = enrollments
    .map((e: any) => e.person?._id?.toString?.() ?? e.person?.toString?.() ?? '')
    .filter(Boolean)

  const checkIns = personIds.length
    ? await EventCheckIn.find({ event: eventDoc._id, person: { $in: personIds } })
        .select('person checkInTime wristbandNumber')
        .lean()
    : []

  const checkInMap = new Map<string, any>()
  for (const ci of checkIns) {
    const pid = ci.person?.toString?.() ?? ''
    if (pid && !checkInMap.has(pid)) checkInMap.set(pid, ci)
  }

  return {
    items: enrollments.map((e: any) => {
      const personId = e.person?._id?.toString?.() ?? e.person?.toString?.() ?? ''
      const ci = personId ? checkInMap.get(personId) : undefined
      return {
        id: e._id.toString(),
        eventId: id,
        personId,
        personName: e.person?.name ?? '',
        personBirthDate: e.person?.birthDate ?? null,
        personPhone: e.person?.phone ?? '',
        enrolledById: e.enrolledBy?._id?.toString?.() ?? e.enrolledBy?.toString?.() ?? '',
        enrolledByName: e.enrolledBy?.name ?? '',
        enrolledByPhone: e.enrolledBy?.phone ?? '',
        status: e.status,
        registeredAt: e.registeredAt,
        createdAt: e.createdAt,
        // Estado de entrada
        checkedIn: !!ci,
        checkInTime: ci?.checkInTime ?? null,
        checkInId: ci?._id?.toString?.() ?? null,
        wristbandNumber: ci?.wristbandNumber ?? null,
      }
    }),
    total: enrollments.length,
  }
})
