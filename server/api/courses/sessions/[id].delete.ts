import { CourseSession } from '~~/server/models/CourseSession'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de sesión requerido' })
  }

  const session = await CourseSession.findById(id)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Sesión no encontrada' })
  }

  await CourseAttendance.deleteMany({ session: session._id })
  await CourseSession.findByIdAndDelete(session._id)

  return { success: true, id }
})