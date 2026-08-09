import { z } from 'zod'
import { Marriage } from '~~/server/models/Marriage'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createMarriageSchema = z.object({
  spouse1Id: z.string().min(1, 'El cónyuge 1 es requerido'),
  spouse2Id: z.string().min(1, 'El cónyuge 2 es requerido'),
  marriageDate: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MARRIAGES_CREATE)

  const body = await readBody(event)
  const result = createMarriageSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de matrimonio fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { spouse1Id, spouse2Id, marriageDate } = result.data

  if (spouse1Id === spouse2Id) {
    throw createError({ statusCode: 400, statusMessage: 'Los cónyuges deben ser personas diferentes' })
  }

  // Validar que ambos existan
  const [spouse1, spouse2] = await Promise.all([
    Person.findById(spouse1Id),
    Person.findById(spouse2Id),
  ])
  if (!spouse1) {
    throw createError({ statusCode: 400, statusMessage: 'El cónyuge 1 no existe' })
  }
  if (!spouse2) {
    throw createError({ statusCode: 400, statusMessage: 'El cónyuge 2 no existe' })
  }

  // Validar que ninguno esté en un matrimonio activo
  const existing = await Marriage.findOne({
    $or: [{ spouse1: spouse1._id }, { spouse2: spouse1._id }, { spouse1: spouse2._id }, { spouse2: spouse2._id }],
    status: 'active',
  })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'Uno de los cónyuges ya tiene un matrimonio activo' })
  }

  const marriage = await Marriage.create({
    spouse1: spouse1._id,
    spouse2: spouse2._id,
    marriageDate: marriageDate ? new Date(marriageDate) : undefined,
    status: 'active',
  })

  // Actualizar el estado civil de ambos
  await Person.updateOne({ _id: spouse1._id }, { $set: { maritalStatus: 'married' } })
  await Person.updateOne({ _id: spouse2._id }, { $set: { maritalStatus: 'married' } })

  return {
    id: marriage._id.toString(),
    spouse1Id: marriage.spouse1.toString(),
    spouse2Id: marriage.spouse2.toString(),
    marriageDate: marriage.marriageDate,
    status: marriage.status,
    createdAt: marriage.createdAt,
  }
})