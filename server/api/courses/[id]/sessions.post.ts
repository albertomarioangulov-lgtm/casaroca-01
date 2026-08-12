import { z } from 'zod'
import { Course } from '~~/server/models/Course'
import { CourseSession } from '~~/server/models/CourseSession'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const createSessionSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  topic: z.string().optional(),
  location: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de curso requerido' })
  }

  const course = await Course.findById(id)
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }

  const body = await readBody(event)
  const result = createSessionSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de sesión fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { date, topic, location } = result.data

  const session = await CourseSession.create({
    course: course._id,
    date: parseDateOnly(date),
    topic,
    location,
  })

  return {
    id: session._id.toString(),
    courseId: session.course.toString(),
    date: session.date,
    topic: session.topic,
    location: session.location,
    createdAt: session.createdAt,
  }
})