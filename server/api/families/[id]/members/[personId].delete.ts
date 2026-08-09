import { Family } from '~~/server/models/Family'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_UPDATE)

  const id = getRouterParam(event, 'id')
  const personId = getRouterParam(event, 'personId')
  if (!id || !personId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de familia y de persona requeridos' })
  }

  const family = await Family.findById(id)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Familia no encontrada' })
  }

  const wasMember = (family.members ?? []).some(
    (m: any) => m.person?.toString?.() === personId
  )
  if (!wasMember) {
    throw createError({ statusCode: 404, statusMessage: 'La persona no es miembro de esta familia' })
  }

  await Family.findByIdAndUpdate(
    id,
    { $pull: { members: { person: personId } } }
  )

  return { success: true, familyId: id, personId }
})