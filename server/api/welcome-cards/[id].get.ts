import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const card = await WelcomeCard.findById(id)
    .populate('person', 'name phone email birthDate')
    .populate('event', 'name date')
    .lean()

  if (!card) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  const c: any = card
  return {
    id: c._id?.toString?.() ?? '',
    personId: c.person?._id?.toString?.() ?? c.person?.toString?.() ?? '',
    personName: c.person?.name ?? '',
    personBirthDate: c.person?.birthDate ?? null,
    eventId: c.event?._id?.toString?.() ?? c.event?.toString?.() ?? '',
    eventName: c.event?.name ?? '',
    eventDate: c.event?.date ?? null,
    registrationDate: c.registrationDate,
    visitorType: c.visitorType,
    name: c.name,
    email: c.email,
    phone: c.phone,
    motivations: c.motivations ?? [],
    motivationOther: c.motivationOther ?? '',
    acceptedJesus: c.acceptedJesus ?? '',
    connectionInterest: c.connectionInterest ?? '',
    wantsOtherCampus: c.wantsOtherCampus ?? '',
    campus: c.campus ?? '',
    followUpInterests: c.followUpInterests ?? [],
    affinityGroup: c.affinityGroup ?? '',
    spouseName: c.spouseName ?? '',
    registrationOrigin: c.registrationOrigin ?? '',
    prayerRequest: c.prayerRequest ?? '',
    acceptsDataPolicy: c.acceptsDataPolicy ?? '',
    followUpStatus: c.followUpStatus ?? 'not_started',
    followUpStoppedAt: c.followUpStoppedAt ?? null,
    followUpStoppedReason: c.followUpStoppedReason ?? '',
    connectionEventId: c.connectionEvent?._id?.toString?.() ?? c.connectionEvent?.toString?.() ?? '',
    connectionEventName: c.connectionEvent?.name ?? '',
    connectionEventDate: c.connectionEvent?.date ?? null,
    connectionEventInvitedAt: c.connectionEventInvitedAt ?? null,
    personSnapshot: c.personSnapshot ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
})