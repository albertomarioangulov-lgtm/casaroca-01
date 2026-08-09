import { Event } from '~~/server/models/Event'
import { EventAssignment } from '~~/server/models/EventAssignment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ASSIGNMENTS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const assignments = await EventAssignment.find({ event: eventDoc._id })
    .populate('ministryRole', 'name')
    .populate('assignedPersons', 'name')
    .sort({ createdAt: 1 })
    .lean()

  return {
    items: assignments.map((a: any) => ({
      id: a._id.toString(),
      eventId: id,
      assignmentType: a.assignmentType,
      ministryRoleId: a.ministryRole?._id?.toString?.() ?? a.ministryRole?.toString?.() ?? '',
      ministryRoleName: a.ministryRole?.name ?? '',
      roleName: a.roleName,
      description: a.description,
      minAge: a.minAge,
      maxAge: a.maxAge,
      assignedPersons: (a.assignedPersons ?? []).map((p: any) => ({
        id: p._id?.toString?.() ?? p?.toString?.() ?? '',
        name: p.name ?? '',
      })),
      createdAt: a.createdAt,
    })),
    total: assignments.length,
  }
})