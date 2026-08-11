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

const updateMinistrySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  code: z.string().trim().min(1, 'El código es requerido').optional(),
  description: z.string().nullable().optional(),
  eligibilityType: z.enum(['age', 'gender', 'marital', 'general', 'none']).optional(),
  minAge: z.number().int().min(0).nullable().optional(),
  maxAge: z.number().int().min(0).nullable().optional(),
  ageGroups: z.array(ageGroupSchema).nullable().optional(),
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
  for (const field of ['gender', 'maritalStatus', 'minAge', 'maxAge', 'icon', 'color', 'description', 'ageGroups']) {
    if (field in updateData && !updateData[field]) {
      updateData[field] = undefined
    }
  }

  // Si se envían rangos de edad, verificar que estén dentro del rango principal
  // del ministerio y que no compartan edades entre sí
  if (updateData.ageGroups && updateData.ageGroups.length > 0) {
    const existing = await Ministry.findById(id).lean()
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Ministerio no encontrado' })
    }
    const principalMin = updateData.minAge ?? existing.minAge ?? 0
    const principalMax = updateData.maxAge ?? existing.maxAge ?? 999
    const sortedGroups = [...updateData.ageGroups].sort((a: any, b: any) => a.minAge - b.minAge)
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
    ageGroups: ministry.ageGroups ?? [],
    gender: ministry.gender,
    maritalStatus: ministry.maritalStatus,
    icon: ministry.icon,
    color: ministry.color,
    isActive: ministry.isActive,
    createdAt: ministry.createdAt,
    updatedAt: ministry.updatedAt,
  }
})