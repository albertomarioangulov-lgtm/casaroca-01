import { z } from 'zod'
import { Child } from '~~/server/models/Child'
import { Caregiver } from '~~/server/models/Caregiver'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateChildSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  birthDate: z.string().optional(),
  caregivers: z
    .array(
      z.object({
        caregiverId: z.string().min(1),
        relationship: z.string().optional(),
      })
    )
    .optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHILDREN_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de niño requerido' })
  }

  const body = await readBody(event)
  const result = updateChildSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de niño fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = {}
  if (result.data.name !== undefined) updateData.name = result.data.name
  if (result.data.birthDate !== undefined) {
    updateData.birthDate = result.data.birthDate ? new Date(result.data.birthDate) : null
  }
  if (result.data.caregivers !== undefined) {
    const caregiversData = []
    for (const cg of result.data.caregivers) {
      const exists = await Caregiver.findById(cg.caregiverId)
      if (!exists) {
        throw createError({
          statusCode: 400,
          statusMessage: `El acudiente ${cg.caregiverId} no existe`,
        })
      }
      caregiversData.push({
        caregiver: cg.caregiverId,
        relationship: cg.relationship || '',
      })
    }
    updateData.caregivers = caregiversData
  }

  const child = await Child.findByIdAndUpdate(id, updateData, { new: true })
    .populate('caregivers.caregiver', 'name phone')
    .lean()

  if (!child) {
    throw createError({ statusCode: 404, statusMessage: 'Niño no encontrado' })
  }

  return {
    id: child._id.toString(),
    name: child.name,
    birthDate: child.birthDate,
    caregivers: (child.caregivers ?? []).map((cg: any) => ({
      id: cg.caregiver?._id?.toString?.() ?? cg.caregiver?.toString?.() ?? '',
      name: cg.caregiver?.name ?? '',
      phone: cg.caregiver?.phone ?? '',
      relationship: cg.relationship,
    })),
    createdAt: child.createdAt,
    updatedAt: child.updatedAt,
  }
})