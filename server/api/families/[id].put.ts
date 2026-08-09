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
  roleInFamily: z.string().trim().min(1, 'El rol en la familia es requerido'),
})

const updateFamilySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la familia es requerido').optional(),
  members: z.array(memberInputSchema).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de familia requerido' })
  }

  const body = await readBody(event)
  const result = updateFamilySchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de familia fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = {}
  if (result.data.name) updateData.name = result.data.name

  // Si vienen miembros, resolverlos
  if (result.data.members) {
    const resolvedMembers = []
    let idx = 0
    for (const member of result.data.members) {
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
    updateData.members = resolvedMembers
  }

  const family = await Family.findByIdAndUpdate(id, updateData, { new: true })
    .populate('members.person', 'name phone')
    .lean()

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Familia no encontrada' })
  }

  return {
    id: family._id.toString(),
    name: family.name,
    members: (family.members ?? []).map((m: any) => ({
      personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
      name: m.person?.name ?? '',
      roleInFamily: m.roleInFamily,
    })),
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  }
})