import { z } from 'zod'
import { Marriage } from '~~/server/models/Marriage'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const updateMarriageSchema = z.object({
  status: z.enum(['active', 'divorced', 'widowed']),
  marriageDate: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MARRIAGES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de matrimonio requerido' })
  }

  const body = await readBody(event)
  const result = updateMarriageSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de matrimonio fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const marriage = await Marriage.findById(id)
  if (!marriage) {
    throw createError({ statusCode: 404, statusMessage: 'Matrimonio no encontrado' })
  }

  const updateData: Record<string, any> = {}
  if (result.data.status) updateData.status = result.data.status
  if ('marriageDate' in result.data) {
    updateData.marriageDate = result.data.marriageDate ? parseDateOnly(result.data.marriageDate) : undefined
  }

  const updated = await Marriage.findByIdAndUpdate(marriage._id, updateData, { new: true }).lean()

  // Sincronizar estado civil de ambos cónyuges
  const newStatus = result.data.status
  const maritalForSpouses = newStatus === 'divorced' ? 'divorced' : newStatus === 'widowed' ? 'widowed' : 'married'
  await Person.updateOne({ _id: marriage.spouse1 }, { $set: { maritalStatus: maritalForSpouses } })
  await Person.updateOne({ _id: marriage.spouse2 }, { $set: { maritalStatus: maritalForSpouses } })

  return {
    id: updated!._id.toString(),
    spouse1Id: updated!.spouse1.toString(),
    spouse2Id: updated!.spouse2.toString(),
    marriageDate: updated!.marriageDate,
    status: updated!.status,
    createdAt: updated!.createdAt,
    updatedAt: updated!.updatedAt,
  }
})