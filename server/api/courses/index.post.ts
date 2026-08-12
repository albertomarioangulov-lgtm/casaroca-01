import { z } from 'zod'
import { Course } from '~~/server/models/Course'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const createCourseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  ministryId: z.string().optional(),
  status: z.enum(['draft', 'active', 'finished']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_CREATE)

  const body = await readBody(event)
  const result = createCourseSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de curso fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, description, startDate, endDate, ministryId, status } = result.data

  // Validar ministerio si se envía
  if (ministryId) {
    const ministry = await Ministry.findById(ministryId)
    if (!ministry) {
      throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
    }
  }

  const course = await Course.create({
    name,
    description,
    startDate: parseDateOnly(startDate),
    endDate: parseDateOnly(endDate),
    ministry: ministryId || undefined,
    status: status ?? 'draft',
  })

  return {
    id: course._id.toString(),
    name: course.name,
    description: course.description,
    startDate: course.startDate,
    endDate: course.endDate,
    ministryId: course.ministry?.toString?.() ?? null,
    status: course.status,
    createdAt: course.createdAt,
  }
})