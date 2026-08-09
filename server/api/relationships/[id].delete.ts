import { Relationship } from '~~/server/models/Relationship'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.RELATIONSHIPS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de relación requerido' })
  }

  const relationship = await Relationship.findById(id)
  if (!relationship) {
    throw createError({ statusCode: 404, statusMessage: 'Relación no encontrada' })
  }

  await Relationship.findByIdAndDelete(relationship._id)

  return { success: true, id }
})