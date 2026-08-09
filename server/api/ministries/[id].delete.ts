import { Ministry } from '~~/server/models/Ministry'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { MinistryRole } from '~~/server/models/MinistryRole'
import { Invitation } from '~~/server/models/Invitation'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRIES_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de ministerio requerido' })
  }

  const ministry = await Ministry.findById(id)
  if (!ministry) {
    throw createError({ statusCode: 404, statusMessage: 'Ministerio no encontrado' })
  }

  // Eliminar las membresías, funciones e invitaciones asociadas
  await MinistryMembership.deleteMany({ ministry: ministry._id })
  await MinistryRole.deleteMany({ ministry: ministry._id })
  await Invitation.deleteMany({ ministry: ministry._id })

  await Ministry.findByIdAndDelete(ministry._id)

  return { success: true, id }
})