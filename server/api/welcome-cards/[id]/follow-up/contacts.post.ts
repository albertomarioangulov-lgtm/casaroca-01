import { z } from 'zod'
import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { Person } from '~~/server/models/Person'
import { FollowUpContact } from '~~/server/models/FollowUpContact'
import { Event } from '~~/server/models/Event'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const createContactSchema = z.object({
  contactDate: z.string().optional(),
  channel: z.enum(['whatsapp', 'phone', 'email', 'in_person']).default('whatsapp'),
  result: z.enum([
    'interested',
    'not_interested',
    'accepted_invitation',
    'declined_invitation',
    'no_response',
  ]).default('interested'),
  notes: z.string().nullable().optional(),
  connectionEventId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const body = await readBody(event)
  const result = createContactSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de contacto fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const card = await WelcomeCard.findById(id).lean()
  if (!card) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  const data = result.data

  // Si el resultado es "aceptó invitación", el evento de conexión es obligatorio
  if (data.result === 'accepted_invitation' && !data.connectionEventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes seleccionar el evento de conexión al que aceptó la invitación',
    })
  }

  // Validar el evento de conexión si se envía
  let connectionEventDoc: any = null
  if (data.connectionEventId) {
    connectionEventDoc = await Event.findById(data.connectionEventId)
    if (!connectionEventDoc) {
      throw createError({ statusCode: 400, statusMessage: 'El evento de conexión no existe' })
    }
  }

  // Quién registra el contacto
  const session = await getUserSession(event)
  const createdBy = session.user?.id || session.user?.email || null

  // Construir actualizaciones de la tarjeta
  const cardUpdates: Record<string, any> = {}

  // Si la persona aceptó la invitación, guardar el evento de conexión en la tarjeta
  if (data.result === 'accepted_invitation' && connectionEventDoc) {
    cardUpdates.connectionEvent = connectionEventDoc._id
    cardUpdates.connectionEventInvitedAt = new Date()
  }

  // Estado del seguimiento:
  // - not_interested → se detiene automáticamente
  // - cualquier otro contacto → el seguimiento está activo
  if (data.result === 'not_interested') {
    cardUpdates.followUpStatus = 'no_interested'
    cardUpdates.followUpStoppedAt = new Date()
    cardUpdates.followUpStoppedReason = 'No está interesado en continuar el proceso'
  } else {
    cardUpdates.followUpStatus = 'active'
  }

  await WelcomeCard.findByIdAndUpdate(id, cardUpdates)

  // Al aceptar la invitación, garantizar persona + pre-inscripción al evento
  // para que la persona aparezca como invitada.
  let resolvedPersonId: any = card.person
  if (data.result === 'accepted_invitation' && connectionEventDoc) {
    // Resolver la persona: usar la vinculada, o crearla desde el snapshot de la tarjeta
    if (!resolvedPersonId && card.personSnapshot?.name) {
      const newPerson = await Person.create({
        name: card.personSnapshot.name,
        phone: card.personSnapshot.phone || undefined,
        email: card.personSnapshot.email || undefined,
      })
      resolvedPersonId = newPerson._id
      await WelcomeCard.findByIdAndUpdate(id, { person: resolvedPersonId })
    }

    if (resolvedPersonId) {
      const existingEnrollment = await EventEnrollment.findOne({
        event: connectionEventDoc._id,
        person: resolvedPersonId,
        status: 'registered',
      })
      if (!existingEnrollment) {
        await EventEnrollment.create({
          event: connectionEventDoc._id,
          person: resolvedPersonId,
          enrolledBy: resolvedPersonId, // la misma persona es quien se pre-inscribe (aceptó la invitación)
          status: 'registered',
        })
      }
      cardUpdates.person = resolvedPersonId
      cardUpdates.connectionEvent = connectionEventDoc._id
    }
  }

  // Crear el contacto
  const contactDoc = await FollowUpContact.create({
    welcomeCard: id,
    person: resolvedPersonId || undefined,
    contactDate: data.contactDate ? parseDateOnly(data.contactDate) : new Date(),
    channel: data.channel,
    result: data.result,
    notes: data.notes || undefined,
    connectionEvent: connectionEventDoc?._id || undefined,
    createdBy: createdBy || undefined,
  })

  return {
    id: contactDoc._id.toString(),
    cardId: id,
    contactDate: contactDoc.contactDate,
    channel: contactDoc.channel,
    result: contactDoc.result,
    notes: contactDoc.notes ?? '',
    connectionEventId: connectionEventDoc?._id?.toString?.() ?? '',
    followUpStatus: cardUpdates.followUpStatus ?? 'active',
  }
})