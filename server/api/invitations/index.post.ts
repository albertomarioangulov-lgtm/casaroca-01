import { z } from 'zod'
import { Invitation } from '~~/server/models/Invitation'
import { Person } from '~~/server/models/Person'
import { Ministry } from '~~/server/models/Ministry'
import { Event } from '~~/server/models/Event'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createInvitationSchema = z.object({
  personId: z.string().min(1, 'La persona es requerida'),
  ministryId: z.string().min(1, 'El ministerio es requerido'),
  eventId: z.string().optional(),
  channel: z.enum(['in_person', 'whatsapp', 'phone', 'email', 'portal']).default('in_person'),
  message: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVITATIONS_CREATE)

  const body = await readBody(event)
  const result = createInvitationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de invitación fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { personId, ministryId, eventId, channel, message } = result.data

  // Validar persona y ministerio
  const person = await Person.findById(personId)
  if (!person) {
    throw createError({ statusCode: 400, statusMessage: 'La persona no existe' })
  }
  const ministry = await Ministry.findById(ministryId)
  if (!ministry) {
    throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
  }

  // Validar evento si se envía
  if (eventId) {
    const event = await Event.findById(eventId)
    if (!event) {
      throw createError({ statusCode: 400, statusMessage: 'El evento no existe' })
    }
  }

  // Obtener el usuario autenticado como quien invita
  const session = await getUserSession(event)
  const invitedBy = session.user?.id || session.user?.email
  if (!invitedBy) {
    throw createError({ statusCode: 401, statusMessage: 'Usuario no autenticado' })
  }

  const invitation = await Invitation.create({
    person: person._id,
    ministry: ministry._id,
    event: eventId || undefined,
    invitedBy,
    channel,
    message,
    status: 'pending',
  })

  return {
    id: invitation._id.toString(),
    personId: invitation.person.toString(),
    ministryId: invitation.ministry.toString(),
    eventId: invitation.event?.toString?.() ?? null,
    invitedBy: invitation.invitedBy.toString(),
    channel: invitation.channel,
    message: invitation.message,
    status: invitation.status,
    invitedAt: invitation.invitedAt,
    createdAt: invitation.createdAt,
  }
})