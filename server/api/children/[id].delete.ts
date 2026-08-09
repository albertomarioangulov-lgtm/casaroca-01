import { Child } from '~~/server/models/Child'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHILDREN_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de niño requerido' })
  }

  // Elimina los check-ins asociados al niño
  await EventCheckIn.deleteMany({ childId: id })

  const child = await Child.findByIdAndDelete(id)

  if (!child) {
    throw createError({ statusCode: 404, statusMessage: 'Niño no encontrado' })
  }

  return { success: true }
})