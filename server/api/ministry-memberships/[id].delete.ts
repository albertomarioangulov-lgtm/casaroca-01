import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { EventAssignment } from '~~/server/models/EventAssignment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MEMBERSHIPS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de membresía requerido' })
  }

  const membership = await MinistryMembership.findById(id)
  if (!membership) {
    throw createError({ statusCode: 404, statusMessage: 'Membresía no encontrada' })
  }

  // Quitar la persona de las asignaciones de eventos que la referencien
  await EventAssignment.updateMany(
    { assignedPersons: membership.person },
    { $pull: { assignedPersons: membership.person } }
  )

  await MinistryMembership.findByIdAndDelete(membership._id)

  return { success: true, id }
})