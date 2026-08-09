import { z } from 'zod'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { Course } from '~~/server/models/Course'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createEnrollmentSchema = z.object({
  courseId: z.string().min(1, 'El curso es requerido'),
  personId: z.string().min(1, 'La persona es requerida'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ENROLLMENTS_CREATE)

  const body = await readBody(event)
  const result = createEnrollmentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de solicitud fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { courseId, personId } = result.data

  // Validar curso y persona
  const [course, person] = await Promise.all([
    Course.findById(courseId),
    Person.findById(personId),
  ])
  if (!course) {
    throw createError({ statusCode: 400, statusMessage: 'El curso no existe' })
  }
  if (!person) {
    throw createError({ statusCode: 400, statusMessage: 'La persona no existe' })
  }

  // No permitir solicitud duplicada pendiente o aprobada
  const existing = await CourseEnrollment.findOne({
    course: course._id,
    person: person._id,
    status: { $in: ['pending', 'approved'] },
  })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'Ya existe una solicitud pendiente o aprobada para este curso' })
  }

  const enrollment = await CourseEnrollment.create({
    course: course._id,
    person: person._id,
    status: 'pending',
  })

  return {
    id: enrollment._id.toString(),
    courseId: enrollment.course.toString(),
    personId: enrollment.person.toString(),
    status: enrollment.status,
    requestDate: enrollment.requestDate,
    createdAt: enrollment.createdAt,
  }
})