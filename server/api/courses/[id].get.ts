import { Course } from '~~/server/models/Course'
import { CourseSession } from '~~/server/models/CourseSession'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de curso requerido' })
  }

  const course = await Course.findById(id)
    .populate('ministry', 'name code color icon')
    .lean()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }

  const [sessions, enrollments] = await Promise.all([
    CourseSession.find({ course: course._id }).sort({ date: 1 }).lean(),
    CourseEnrollment.find({ course: course._id })
      .populate('person', 'name phone email')
      .sort({ requestDate: -1 })
      .lean(),
  ])

  return {
    id: course._id.toString(),
    name: course.name,
    description: course.description,
    startDate: course.startDate,
    endDate: course.endDate,
    ministryId: (course.ministry as any)?._id?.toString?.() ?? (course.ministry as any)?.toString?.() ?? '',
    ministryName: (course.ministry as any)?.name ?? '',
    status: course.status,
    sessions: sessions.map((s) => ({
      id: s._id.toString(),
      date: s.date,
      topic: s.topic,
      location: s.location,
    })),
    enrollments: enrollments.map((e: any) => ({
      id: e._id.toString(),
      personId: e.person?._id?.toString?.() ?? e.person?.toString?.() ?? '',
      personName: e.person?.name ?? '',
      personPhone: e.person?.phone ?? '',
      status: e.status,
      requestDate: e.requestDate,
      decisionDate: e.decisionDate,
    })),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }
})