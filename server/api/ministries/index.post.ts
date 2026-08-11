import { z } from 'zod'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const ageGroupSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del grupo es requerido'),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0),
}).refine((g) => g.maxAge > g.minAge, {
  message: 'Cada salón debe tener un rango válido (mínimo menor que máximo)',
  path: ['maxAge'],
})

const createMinistrySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  code: z.string().trim().min(1, 'El código es requerido'),
  description: z.string().optional(),
  eligibilityType: z.enum(['age', 'gender', 'marital', 'general', 'none']).default('none'),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  ageGroups: z.array(ageGroupSchema).optional(),
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

  const { name, code, description, eligibilityType, minAge, maxAge, ageGroups, gender, maritalStatus, icon, color, isActive } = result.data

  // Verificar que cada salón esté dentro del rango principal del ministerio
  // y que los salones no compartan edades entre sí
  if (ageGroups && ageGroups.length > 0 && eligibilityType === 'age') {
    const principalMin = minAge ?? 0
    const principalMax = maxAge ?? 999
    const sortedGroups = [...ageGroups].sort((a, b) => a.minAge - b.minAge)
    for (let i = 0; i < sortedGroups.length; i++) {
      const g = sortedGroups[i]
      if (g.minAge < principalMin || g.maxAge > principalMax) {
        throw createError({
          statusCode: 400,
          statusMessage: `El salón "${g.name}" (${g.minAge}-${g.maxAge}) está fuera del rango principal del ministerio (${principalMin}-${principalMax}).`,
        })
      }
      if (i > 0) {
        const prev = sortedGroups[i - 1]
        if (g.minAge <= prev.maxAge) {
          throw createError({
            statusCode: 400,
            statusMessage: `Los salones "${prev.name}" (${prev.minAge}-${prev.maxAge}) y "${g.name}" (${g.minAge}-${g.maxAge}) comparten edades. No deben cruzarse.`,
          })
        }
      }
    }
  }

  const ministryDoc = await Ministry.create({
    name,
    code,
    description,
    eligibilityType,
    minAge: eligibilityType === 'age' ? minAge ?? 0 : undefined,
    maxAge: eligibilityType === 'age' ? maxAge ?? 999 : undefined,
    ageGroups,
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
    ageGroups: ministryDoc.ageGroups ?? [],
    gender: ministryDoc.gender,
    maritalStatus: ministryDoc.maritalStatus,
    icon: ministryDoc.icon,
    color: ministryDoc.color,
    isActive: ministryDoc.isActive,
    createdAt: ministryDoc.createdAt,
  }
})