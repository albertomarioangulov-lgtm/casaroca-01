import { z } from 'zod'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updatePersonSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  birthDate: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).nullable().optional(),
  address: z.string().nullable().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).nullable().optional(),
  membershipDate: z.string().nullable().optional(),
  baptismDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PERSONS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const body = await readBody(event)
  const result = updatePersonSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de persona fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  // Convertir fechas a Date y vacíos a null (MongoDB permite null → borra el campo;
  // undefined sería ignorado y no borraría el valor existente)
  for (const field of ['birthDate', 'membershipDate', 'baptismDate']) {
    if (field in updateData) {
      updateData[field] = updateData[field] ? new Date(updateData[field]) : null
    }
  }
  for (const field of ['phone', 'email', 'address']) {
    if (field in updateData && !updateData[field]) {
      updateData[field] = null
    }
  }

  const person = await Person.findByIdAndUpdate(id, updateData, { new: true }).lean()

  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }

  return {
    id: person._id.toString(),
    name: person.name,
    birthDate: person.birthDate,
    phone: person.phone,
    email: person.email,
    gender: person.gender,
    address: person.address,
    maritalStatus: person.maritalStatus,
    membershipDate: person.membershipDate,
    baptismDate: person.baptismDate,
    isActive: person.isActive,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  }
})