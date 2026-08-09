import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ATTENDANCE_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de asistencia requerido' })
  }

  const attendance = await CourseAttendance.findById(id)
  if (!attendance) {
    throw createError({ statusCode: 404, statusMessage: 'Asistencia no encontrada' })
  }

  await CourseAttendance.findByIdAndDelete(attendance._id)

  return { success: true, id }
})