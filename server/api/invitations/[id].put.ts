import { z } from 'zod'
import { Invitation } from '~~/server/models/Invitation'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const respondInvitationSchema = z.object({
  status: z.enum(['accepted', 'declined', 'no_response', 'cancelled']),
  channel: z.enum(['in_person', 'whatsapp', 'phone', 'email', 'portal']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVITATIONS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de invitación requerido' })
  }

  const body = await readBody(event)
  const result = respondInvitationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de invitación fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { status, channel } = result.data

  const invitation = await Invitation.findById(id)
  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitación no encontrada' })
  }

  if (invitation.status === 'accepted' || invitation.status === 'declined') {
    throw createError({ statusCode: 400, statusMessage: 'La invitación ya fue respondida' })
  }

  invitation.status = status
  invitation.respondedAt = new Date()
  if (channel) invitation.channel = channel
  await invitation.save()

  // Si acepta, crear automáticamente la membresía en el ministerio
  if (status === 'accepted') {
    const existing = await MinistryMembership.findOne({
      person: invitation.person,
      ministry: invitation.ministry,
      status: 'active',
    })

    if (!existing) {
      await MinistryMembership.create({
        person: invitation.person,
        ministry: invitation.ministry,
        roleInMinistry: 'member',
        source: 'invitation',
        invitation: invitation._id,
        status: 'active',
      })
    }
  }

  return {
    id: invitation._id.toString(),
    personId: invitation.person.toString(),
    ministryId: invitation.ministry.toString(),
    status: invitation.status,
    respondedAt: invitation.respondedAt,
    channel: invitation.channel,
  }
})