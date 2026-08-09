import { z } from 'zod'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateMinistrySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  code: z.string().trim().min(1, 'El código es requerido').optional(),
  description: z.string().nullable().optional(),
  eligibilityType: z.enum(['age', 'gender', 'marital', 'general', 'none']).optional(),
  minAge: z.number().int().min(0).nullable().optional(),
  maxAge: z.number().int().min(0).nullable().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRIES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de ministerio requerido' })
  }

  const body = await readBody(event)
  const result = updateMinistrySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de ministerio fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  for (const field of ['gender', 'maritalStatus', 'minAge', 'maxAge', 'icon', 'color', 'description']) {
    if (field in updateData && !updateData[field]) {
      updateData[field] = undefined
    }
  }

  // Aplicar reglas de elegibilidad: si cambia el tipo, limpiar campos no aplicables
  if (updateData.eligibilityType) {
    const type = updateData.eligibilityType
    updateData.minAge = type === 'age' ? updateData.minAge : undefined
    updateData.maxAge = type === 'age' ? updateData.maxAge : undefined
    updateData.gender = type === 'gender' ? updateData.gender : undefined
    updateData.maritalStatus = type === 'marital' ? updateData.maritalStatus : undefined
  }

  const ministry = await Ministry.findByIdAndUpdate(id, updateData, { new: true }).lean()

  if (!ministry) {
    throw createError({ statusCode: 404, statusMessage: 'Ministerio no encontrado' })
  }

  return {
    id: ministry._id.toString(),
    name: ministry.name,
    code: ministry.code,
    description: ministry.description,
    eligibilityType: ministry.eligibilityType,
    minAge: ministry.minAge,
    maxAge: ministry.maxAge,
    gender: ministry.gender,
    maritalStatus: ministry.maritalStatus,
    icon: ministry.icon,
    color: ministry.color,
    isActive: ministry.isActive,
    createdAt: ministry.createdAt,
    updatedAt: ministry.updatedAt,
  }
})