import { z } from 'zod'
import { Types } from 'mongoose'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const decideEnrollmentSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ENROLLMENTS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de solicitud requerido' })
  }

  const body = await readBody(event)
  const result = decideEnrollmentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de decisión fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const enrollment = await CourseEnrollment.findById(id)
  if (!enrollment) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada' })
  }

  if (enrollment.status === 'approved' || enrollment.status === 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'La solicitud ya fue decidida' })
  }

  const session = await getUserSession(event)
  const decidedById = session.user?.id || session.user?.email

  enrollment.status = result.data.status
  enrollment.decisionDate = new Date()
  enrollment.decidedBy = decidedById && Types.ObjectId.isValid(decidedById)
    ? new Types.ObjectId(decidedById)
    : undefined
  await enrollment.save()

  return {
    id: enrollment._id.toString(),
    courseId: enrollment.course.toString(),
    personId: enrollment.person.toString(),
    status: enrollment.status,
    requestDate: enrollment.requestDate,
    decisionDate: enrollment.decisionDate,
    decidedBy: enrollment.decidedBy,
  }
})