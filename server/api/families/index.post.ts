import { z } from 'zod'
import { Family } from '~~/server/models/Family'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const memberInputSchema = z.object({
  personId: z.string().optional(),
  name: z.string().trim().min(1).optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  roleInFamily: z.string().trim().min(1, 'El rol en la familia es requerido'), // padre, madre, hijo...
})

const createFamilySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la familia es requerido'),
  members: z.array(memberInputSchema).min(1, 'Debe registrar al menos un miembro'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_CREATE)

  const body = await readBody(event)
  const result = createFamilySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de familia fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, members } = result.data

  // Resolver o crear personas
  const resolvedMembers = []

  let idx = 0
  for (const member of members) {
    idx++
    if (member.personId) {
      const existing = await Person.findById(member.personId)
      if (!existing) {
        throw createError({ statusCode: 400, statusMessage: `La persona seleccionada no existe` })
      }
      resolvedMembers.push({ person: existing._id, roleInFamily: member.roleInFamily })
    } else {
      if (!member.name) {
        throw createError({ statusCode: 400, statusMessage: `El nombre del miembro ${idx} es requerido` })
      }
      const newPerson = await Person.create({
        name: member.name,
        birthDate: member.birthDate ? new Date(member.birthDate) : undefined,
        phone: member.phone || undefined,
        email: member.email || undefined,
        gender: member.gender,
      })
      resolvedMembers.push({ person: newPerson._id, roleInFamily: member.roleInFamily })
    }
  }

  const family = await Family.create({
    name,
    members: resolvedMembers,
  })

  return {
    id: family._id.toString(),
    name: family.name,
    memberCount: family.members.length,
    createdAt: family.createdAt,
  }
})