import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { CourseSession } from '~~/server/models/CourseSession'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ATTENDANCE_READ)

  const query = getQuery(event)
  const sessionId = (query.sessionId as string) || ''
  const courseId = (query.courseId as string) || ''

  const filter: Record<string, any> = {}
  if (sessionId) filter.session = sessionId
  if (courseId) {
    const sessions = await CourseSession.find({ course: courseId }).select('_id').lean()
    filter.session = { $in: sessions.map((s) => s._id) }
  }

  const attendances = await CourseAttendance.find(filter)
    .populate('session', 'date topic location')
    .populate('person', 'name phone email')
    .sort({ createdAt: -1 })
    .lean()

  return {
    items: attendances.map((a: any) => ({
      id: a._id.toString(),
      sessionId: a.session?._id?.toString?.() ?? a.session?.toString?.() ?? '',
      sessionDate: a.session?.date ?? null,
      sessionTopic: a.session?.topic ?? '',
      personId: a.person?._id?.toString?.() ?? a.person?.toString?.() ?? '',
      personName: a.person?.name ?? '',
      personPhone: a.person?.phone ?? '',
      present: a.present,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    total: attendances.length,
  }
})