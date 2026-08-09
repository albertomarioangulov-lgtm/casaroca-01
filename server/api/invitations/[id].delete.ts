import { Invitation } from '~~/server/models/Invitation'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVITATIONS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de invitación requerido' })
  }

  const invitation = await Invitation.findById(id)
  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitación no encontrada' })
  }

  // Desvincular la invitación de las membresías que la referencien
  await MinistryMembership.updateMany(
    { invitation: invitation._id },
    { $unset: { invitation: 1 } }
  )

  await Invitation.findByIdAndDelete(invitation._id)

  return { success: true, id }
})