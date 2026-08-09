import { z } from 'zod'
import { Course } from '~~/server/models/Course'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateCourseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  ministryId: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'finished']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de curso requerido' })
  }

  const body = await readBody(event)
  const result = updateCourseSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de curso fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  if ('description' in updateData && !updateData.description) {
    updateData.description = undefined
  }
  for (const field of ['startDate', 'endDate']) {
    if (field in updateData) {
      updateData[field] = updateData[field] ? new Date(updateData[field]) : undefined
    }
  }
  if ('ministryId' in updateData) {
    const ministryId = updateData.ministryId
    delete updateData.ministryId
    if (ministryId) {
      const ministry = await Ministry.findById(ministryId)
      if (!ministry) {
        throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
      }
      updateData.ministry = ministry._id
    } else {
      updateData.ministry = undefined
    }
  }

  const course = await Course.findByIdAndUpdate(id, updateData, { new: true })
    .populate('ministry', 'name')
    .lean()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }

  return {
    id: course._id.toString(),
    name: course.name,
    description: course.description,
    startDate: course.startDate,
    endDate: course.endDate,
    ministryId: (course.ministry as any)?._id?.toString?.() ?? (course.ministry as any)?.toString?.() ?? '',
    ministryName: (course.ministry as any)?.name ?? '',
    status: course.status,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }
})