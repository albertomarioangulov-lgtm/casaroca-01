import { z } from 'zod'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createMinistrySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  code: z.string().trim().min(1, 'El código es requerido'),
  description: z.string().optional(),
  eligibilityType: z.enum(['age', 'gender', 'marital', 'general', 'none']).default('none'),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  gender: z.enum(['male', 'female']).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRIES_CREATE)

  const body = await readBody(event)
  const result = createMinistrySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de ministerio fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, code, description, eligibilityType, minAge, maxAge, gender, maritalStatus, icon, color, isActive } = result.data

  const ministryDoc = await Ministry.create({
    name,
    code,
    description,
    eligibilityType,
    minAge: eligibilityType === 'age' ? minAge ?? 0 : undefined,
    maxAge: eligibilityType === 'age' ? maxAge ?? 999 : undefined,
    gender: eligibilityType === 'gender' ? gender : undefined,
    maritalStatus: eligibilityType === 'marital' ? maritalStatus : undefined,
    icon,
    color,
    isActive: isActive ?? true,
  })

  return {
    id: ministryDoc._id.toString(),
    name: ministryDoc.name,
    code: ministryDoc.code,
    description: ministryDoc.description,
    eligibilityType: ministryDoc.eligibilityType,
    minAge: ministryDoc.minAge,
    maxAge: ministryDoc.maxAge,
    gender: ministryDoc.gender,
    maritalStatus: ministryDoc.maritalStatus,
    icon: ministryDoc.icon,
    color: ministryDoc.color,
    isActive: ministryDoc.isActive,
    createdAt: ministryDoc.createdAt,
  }
})