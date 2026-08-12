import { z } from 'zod'
import { Child } from '~~/server/models/Child'
import { Caregiver } from '~~/server/models/Caregiver'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const createChildSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
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
  await requirePermission(event, PERMISSIONS.CHILDREN_CREATE)

  const body = await readBody(event)
  const result = createChildSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de niño fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, birthDate, caregivers } = result.data

  // Validar que los acudientes existan
  const caregiversData = []
  if (caregivers?.length) {
    for (const cg of caregivers) {
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
  }

  const child = await Child.create({
    name,
    birthDate: parseDateOnly(birthDate),
    caregivers: caregiversData,
  })

  return {
    id: child._id.toString(),
    name: child.name,
    birthDate: child.birthDate,
    caregivers: caregiversData,
    createdAt: child.createdAt,
  }
})