import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ENROLLMENTS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de solicitud requerido' })
  }

  const enrollment = await CourseEnrollment.findById(id)
  if (!enrollment) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada' })
  }

  await CourseEnrollment.findByIdAndDelete(enrollment._id)

  return { success: true, id }
})