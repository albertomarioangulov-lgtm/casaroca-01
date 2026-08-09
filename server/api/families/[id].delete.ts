import { Family } from '~~/server/models/Family'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de familia requerido' })
  }

  const family = await Family.findById(id)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Familia no encontrada' })
  }

  await Family.findByIdAndDelete(family._id)

  return { success: true, id }
})