import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ENROLLMENTS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de pre-inscripción requerido' })
  }

  const enrollment = await EventEnrollment.findById(id)
  if (!enrollment) {
    throw createError({ statusCode: 404, statusMessage: 'Pre-inscripción no encontrada' })
  }

  // Marcar como cancelada (no se elimina para mantener el historial)
  enrollment.status = 'cancelled'
  await enrollment.save()

  return {
    success: true,
    id: enrollment._id.toString(),
    status: enrollment.status,
  }
})