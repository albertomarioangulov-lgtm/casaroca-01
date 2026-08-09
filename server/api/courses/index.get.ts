import { Course } from '~~/server/models/Course'
import { CourseSession } from '~~/server/models/CourseSession'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_READ)

  const query = getQuery(event)
  const status = (query.status as string) || ''

  const filter: Record<string, any> = {}
  if (status) filter.status = status

  const courses = await Course.find(filter)
    .populate('ministry', 'name code color icon')
    .sort({ createdAt: -1 })
    .lean()

  const items = await Promise.all(courses.map(async (c: any) => {
    const [sessionCount, approvedCount, pendingCount] = await Promise.all([
      CourseSession.countDocuments({ course: c._id }),
      CourseEnrollment.countDocuments({ course: c._id, status: 'approved' }),
      CourseEnrollment.countDocuments({ course: c._id, status: 'pending' }),
    ])

    return {
      id: c._id.toString(),
      name: c.name,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      ministryId: c.ministry?._id?.toString?.() ?? c.ministry?.toString?.() ?? '',
      ministryName: c.ministry?.name ?? '',
      ministryColor: c.ministry?.color ?? '',
      status: c.status,
      sessionCount,
      approvedCount,
      pendingCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }
  }))

  return { items, total: items.length }
})