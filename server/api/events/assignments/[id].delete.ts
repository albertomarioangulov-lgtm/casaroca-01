import { EventAssignment } from '~~/server/models/EventAssignment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ASSIGNMENTS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de asignación requerido' })
  }

  const assignment = await EventAssignment.findById(id)
  if (!assignment) {
    throw createError({ statusCode: 404, statusMessage: 'Asignación no encontrada' })
  }

  await EventAssignment.findByIdAndDelete(assignment._id)

  return { success: true, id }
})