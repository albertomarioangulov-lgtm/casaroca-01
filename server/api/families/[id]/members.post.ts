import { z } from 'zod'
import { Family } from '~~/server/models/Family'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const memberInputSchema = z.object({
  personId: z.string().optional(), // Si viene, es una persona existente
  name: z.string().trim().min(1).optional(), // Si es nueva
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  roleInFamily: z.string().trim().min(1, 'El rol en la familia es requerido'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de familia requerido' })
  }

  const family = await Family.findById(id)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Familia no encontrada' })
  }

  const body = await readBody(event)
  const result = memberInputSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de miembro fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { personId, name, birthDate, phone, email, gender, roleInFamily } = result.data

  // Resolver la persona a agregar
  let personDoc
  if (personId) {
    personDoc = await Person.findById(personId)
    if (!personDoc) {
      throw createError({ statusCode: 400, statusMessage: 'La persona seleccionada no existe' })
    }
  } else {
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'El nombre del miembro es requerido' })
    }
    personDoc = await Person.create({
      name,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      phone: phone || undefined,
      email: email || undefined,
      gender,
    })
  }

  const personStr = personDoc._id.toString()
  const alreadyMember = (family.members ?? []).some(
    (m: any) => m.person?.toString?.() === personStr
  )
  if (alreadyMember) {
    throw createError({ statusCode: 409, statusMessage: 'Esta persona ya es miembro de la familia' })
  }

  family.members.push({ person: personDoc._id, roleInFamily })
  await family.save()

  const populated = await Family.findById(family._id)
    .populate('members.person', 'name phone email birthDate gender')
    .lean()

  return {
    id: populated!._id.toString(),
    name: populated!.name,
    members: (populated!.members ?? []).map((m: any) => ({
      personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
      name: m.person?.name ?? '',
      roleInFamily: m.roleInFamily,
    })),
    createdAt: populated!.createdAt,
    updatedAt: populated!.updatedAt,
  }
})