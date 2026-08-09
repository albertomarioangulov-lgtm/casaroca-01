import { z } from 'zod'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateAttendanceSchema = z.object({
  present: z.boolean(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ATTENDANCE_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de asistencia requerido' })
  }

  const body = await readBody(event)
  const result = updateAttendanceSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de asistencia fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const attendance = await CourseAttendance.findByIdAndUpdate(
    id,
    { present: result.data.present },
    { new: true }
  )
    .populate('session', 'date topic')
    .populate('person', 'name phone')
    .lean()

  if (!attendance) {
    throw createError({ statusCode: 404, statusMessage: 'Asistencia no encontrada' })
  }

  return {
    id: attendance._id.toString(),
    sessionId: (attendance.session as any)?._id?.toString?.() ?? (attendance.session as any)?.toString?.() ?? '',
    sessionDate: (attendance.session as any)?.date ?? null,
    personId: (attendance.person as any)?._id?.toString?.() ?? (attendance.person as any)?.toString?.() ?? '',
    personName: (attendance.person as any)?.name ?? '',
    present: attendance.present,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
  }
})