import { z } from 'zod'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const createPersonSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional().or(z.literal('')),
  address: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional().or(z.literal('')),
  membershipDate: z.string().optional(),
  baptismDate: z.string().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PERSONS_CREATE)

  const body = await readBody(event)
  const result = createPersonSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de persona fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, birthDate, phone, email, gender, address, maritalStatus, membershipDate, baptismDate, isActive } = result.data

  const personDoc = await Person.create({
    name,
    birthDate: parseDateOnly(birthDate),
    phone,
    email: email || undefined,
    gender: gender || undefined,
    address,
    maritalStatus: maritalStatus || undefined,
    membershipDate: parseDateOnly(membershipDate),
    baptismDate: parseDateOnly(baptismDate),
    isActive: isActive ?? true,
  })

  return {
    id: personDoc._id.toString(),
    name: personDoc.name,
    birthDate: personDoc.birthDate,
    phone: personDoc.phone,
    email: personDoc.email,
    gender: personDoc.gender,
    address: personDoc.address,
    maritalStatus: personDoc.maritalStatus,
    membershipDate: personDoc.membershipDate,
    baptismDate: personDoc.baptismDate,
    isActive: personDoc.isActive,
    createdAt: personDoc.createdAt,
  }
})