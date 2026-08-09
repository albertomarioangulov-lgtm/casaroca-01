import { z } from 'zod'
import { Caregiver } from '~~/server/models/Caregiver'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateCaregiverSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  phone: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de acudiente requerido' })
  }

  const body = await readBody(event)
  const result = updateCaregiverSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de acudiente fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const caregiver = await Caregiver.findByIdAndUpdate(id, result.data, { new: true }).lean()

  if (!caregiver) {
    throw createError({ statusCode: 404, statusMessage: 'Acudiente no encontrado' })
  }

  return {
    id: caregiver._id.toString(),
    name: caregiver.name,
    phone: caregiver.phone,
    createdAt: caregiver.createdAt,
    updatedAt: caregiver.updatedAt,
  }
})