import { Course } from '~~/server/models/Course'
import { CourseSession } from '~~/server/models/CourseSession'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de curso requerido' })
  }

  const course = await Course.findById(id)
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }

  const sessions = await CourseSession.find({ course: course._id }).sort({ date: 1 }).lean()

  const items = await Promise.all(sessions.map(async (s) => {
    const attendanceCount = await CourseAttendance.countDocuments({ session: s._id, present: true })
    return {
      id: s._id.toString(),
      date: s.date,
      topic: s.topic,
      location: s.location,
      attendanceCount,
      createdAt: s.createdAt,
    }
  }))

  return { items, total: items.length }
})