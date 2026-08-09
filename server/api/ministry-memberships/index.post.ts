import { z } from 'zod'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Person } from '~~/server/models/Person'
import { Ministry } from '~~/server/models/Ministry'
import { Invitation } from '~~/server/models/Invitation'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createMembershipSchema = z.object({
  personId: z.string().min(1, 'La persona es requerida'),
  ministryId: z.string().min(1, 'El ministerio es requerido'),
  roleInMinistry: z.enum(['member', 'leader', 'director']).default('member'),
  specialties: z.array(z.string()).optional(),
  source: z.enum(['voluntary', 'invitation']).default('voluntary'),
  invitationId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MEMBERSHIPS_CREATE)

  const body = await readBody(event)
  const result = createMembershipSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de membresía fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { personId, ministryId, roleInMinistry, specialties, source, invitationId, status } = result.data

  // Validar que la persona exista
  const person = await Person.findById(personId)
  if (!person) {
    throw createError({ statusCode: 400, statusMessage: 'La persona no existe' })
  }

  // Validar que el ministerio exista
  const ministry = await Ministry.findById(ministryId)
  if (!ministry) {
    throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
  }

  // Validar que no exista una membresía activa duplicada
  const existing = await MinistryMembership.findOne({
    person: person._id,
    ministry: ministry._id,
    status: 'active',
  })
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'La persona ya está vinculada a este ministerio' })
  }

  // Si viene de una invitación, validar la invitación
  let invitationDoc = null
  if (invitationId) {
    invitationDoc = await Invitation.findById(invitationId)
    if (!invitationDoc) {
      throw createError({ statusCode: 400, statusMessage: 'La invitación no existe' })
    }
    if (!invitationDoc.respondedAt) {
      invitationDoc.respondedAt = new Date()
      await invitationDoc.save()
    }
  }

  const membership = await MinistryMembership.create({
    person: person._id,
    ministry: ministry._id,
    roleInMinistry,
    specialties: specialties || [],
    source,
    invitation: invitationDoc?._id || undefined,
    status: status ?? 'active',
  })

  return {
    id: membership._id.toString(),
    personId: membership.person.toString(),
    ministryId: membership.ministry.toString(),
    roleInMinistry: membership.roleInMinistry,
    source: membership.source,
    invitationId: membership.invitation?.toString?.() ?? null,
    joinedAt: membership.joinedAt,
    status: membership.status,
    createdAt: membership.createdAt,
  }
})