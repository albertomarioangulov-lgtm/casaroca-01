import { Event } from '~~/server/models/Event'
import { EventAssignment } from '~~/server/models/EventAssignment'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { Invitation } from '~~/server/models/Invitation'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Eliminar dependencias del evento
  await EventAssignment.deleteMany({ event: eventDoc._id })
  await EventEnrollment.deleteMany({ event: eventDoc._id })
  await EventCheckIn.deleteMany({ event: eventDoc._id })
  await Invitation.updateMany(
    { event: eventDoc._id },
    { $unset: { event: 1 } }
  )

  await Event.findByIdAndDelete(eventDoc._id)

  return { success: true, id }
})