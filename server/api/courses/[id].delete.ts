import { Course } from '~~/server/models/Course'
import { CourseSession } from '~~/server/models/CourseSession'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de curso requerido' })
  }

  const course = await Course.findById(id)
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }

  // Eliminar sesiones y su asistencia, y las solicitudes de inscripción
  const sessions = await CourseSession.find({ course: course._id }).select('_id').lean()
  const sessionIds = sessions.map((s) => s._id)

  await CourseAttendance.deleteMany({ session: { $in: sessionIds } })
  await CourseSession.deleteMany({ course: course._id })
  await CourseEnrollment.deleteMany({ course: course._id })

  await Course.findByIdAndDelete(course._id)

  return { success: true, id }
})