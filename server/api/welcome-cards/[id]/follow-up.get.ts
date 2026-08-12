import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { FollowUpContact } from '~~/server/models/FollowUpContact'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const card = await WelcomeCard.findById(id)
    .populate('connectionEvent', 'name date status')
    .lean()

  if (!card) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  const contacts = await FollowUpContact.find({ welcomeCard: card._id })
    .populate('connectionEvent', 'name date status')
    .populate('createdBy', 'name email')
    .sort({ contactDate: -1 })
    .lean()

  const c: any = card

  const items = contacts.map((ct: any) => {
    const contact: Record<string, any> = {
      id: ct._id.toString(),
      welcomeCardId: ct.welcomeCard?.toString?.() ?? '',
      personId: ct.person?.toString?.() ?? '',
      contactDate: ct.contactDate,
      channel: ct.channel,
      result: ct.result,
      notes: ct.notes ?? '',
      connectionEventId: '',
      connectionEventName: '',
      connectionEventDate: null,
      createdById: '',
      createdByName: '',
      createdAt: ct.createdAt,
      updatedAt: ct.updatedAt,
    }

    if (ct.connectionEvent) {
      const ev: any = ct.connectionEvent
      contact.connectionEventId = ev._id?.toString?.() ?? ct.connectionEvent.toString?.() ?? ''
      contact.connectionEventName = ev.name ?? ''
      contact.connectionEventDate = ev.date ?? null
    }

    if (ct.createdBy) {
      const user: any = ct.createdBy
      contact.createdById = user._id?.toString?.() ?? ct.createdBy.toString?.() ?? ''
      contact.createdByName = user.name ?? ''
    }

    return contact
  })

  return {
    cardId: c._id?.toString?.() ?? '',
    followUpStatus: c.followUpStatus ?? 'not_started',
    followUpStoppedAt: c.followUpStoppedAt ?? null,
    followUpStoppedReason: c.followUpStoppedReason ?? '',
    connectionEventId: c.connectionEvent?._id?.toString?.() ?? c.connectionEvent?.toString?.() ?? '',
    connectionEventName: c.connectionEvent?.name ?? '',
    connectionEventDate: c.connectionEvent?.date ?? null,
    connectionEventStatus: c.connectionEvent?.status ?? '',
    connectionEventInvitedAt: c.connectionEventInvitedAt ?? null,
    contacts: items,
  }
})