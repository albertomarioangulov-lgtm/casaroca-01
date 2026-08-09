import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ENROLLMENTS_READ)

  const query = getQuery(event)
  const courseId = (query.courseId as string) || ''
  const personId = (query.personId as string) || ''
  const status = (query.status as string) || ''

  const filter: Record<string, any> = {}
  if (courseId) filter.course = courseId
  if (personId) filter.person = personId
  if (status) filter.status = status

  const enrollments = await CourseEnrollment.find(filter)
    .populate('course', 'name status')
    .populate('person', 'name phone email')
    .sort({ requestDate: -1 })
    .lean()

  return {
    items: enrollments.map((e: any) => ({
      id: e._id.toString(),
      courseId: e.course?._id?.toString?.() ?? e.course?.toString?.() ?? '',
      courseName: e.course?.name ?? '',
      personId: e.person?._id?.toString?.() ?? e.person?.toString?.() ?? '',
      personName: e.person?.name ?? '',
      personPhone: e.person?.phone ?? '',
      status: e.status,
      requestDate: e.requestDate,
      decisionDate: e.decisionDate,
      decidedBy: e.decidedBy?.toString?.() ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    total: enrollments.length,
  }
})