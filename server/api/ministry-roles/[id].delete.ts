import { MinistryRole } from '~~/server/models/MinistryRole'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRY_ROLES_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de función requerido' })
  }

  const role = await MinistryRole.findById(id)
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Función no encontrada' })
  }

  // Quitar la función de las especialidades de las membresías
  await MinistryMembership.updateMany(
    {},
    { $pull: { specialties: role._id } }
  )

  await MinistryRole.findByIdAndDelete(role._id)

  return { success: true, id }
})