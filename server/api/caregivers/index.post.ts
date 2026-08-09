import { z } from 'zod'
import { Caregiver } from '~~/server/models/Caregiver'
import { Child } from '~~/server/models/Child'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createCaregiverSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  childIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_CREATE)

  const body = await readBody(event)
  const result = createCaregiverSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de acudiente fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, phone, childIds } = result.data

  const caregiver = await Caregiver.create({
    name,
    phone,
  })

  // Asociar niños existentes con este acudiente
  if (childIds?.length) {
    for (const childId of childIds) {
      const child = await Child.findById(childId)
      if (child) {
        const alreadyLinked = (child.caregivers ?? []).some(
          (cg: any) => cg.caregiver?.toString?.() === caregiver._id.toString()
        )
        if (!alreadyLinked) {
          child.caregivers.push({ caregiver: caregiver._id, relationship: '' })
          await child.save()
        }
      }
    }
  }

  return {
    id: caregiver._id.toString(),
    name: caregiver.name,
    phone: caregiver.phone,
    createdAt: caregiver.createdAt,
  }
})