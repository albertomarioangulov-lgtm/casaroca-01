import { Event } from '~~/server/models/Event'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHECKINS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const query = getQuery(event)
  const status = query.status as string | undefined // 'inside' | 'out'
  const search = (query.search as string) || ''

  const filter: Record<string, any> = { event: eventDoc._id }

  const checkIns = await EventCheckIn.find(filter)
    .populate('person', 'name birthDate')
    .populate('caregiver', 'name phone')
    .populate('allowedPickups', 'name phone')
    .sort({ checkInTime: -1 })
    .lean()

  let items = checkIns
  if (status === 'inside') {
    items = items.filter((c: any) => !c.checkOutTime)
  } else if (status === 'out') {
    items = items.filter((c: any) => !!c.checkOutTime)
  }

  if (search) {
    const lower = search.toLowerCase()
    items = items.filter((c: any) => {
      const personName = c.person?.name?.toLowerCase?.() ?? ''
      const caregiverName = c.caregiver?.name?.toLowerCase?.() ?? ''
      const wristband = c.wristbandNumber?.toLowerCase?.() ?? ''
      return personName.includes(lower) || caregiverName.includes(lower) || wristband.includes(lower)
    })
  }

  return {
    items: items.map((c: any) => ({
      id: c._id.toString(),
      eventId: id,
      personId: c.person?._id?.toString?.() ?? c.person?.toString?.() ?? '',
      personName: c.person?.name ?? '',
      personBirthDate: c.person?.birthDate ?? null,
      checkInMethod: c.checkInMethod,
      caregiverId: c.caregiver?._id?.toString?.() ?? c.caregiver?.toString?.() ?? '',
      caregiverName: c.caregiver?.name ?? '',
      caregiverPhone: c.caregiver?.phone ?? '',
      wristbandNumber: c.wristbandNumber,
      checkInTime: c.checkInTime,
      checkOutTime: c.checkOutTime,
      allowedPickups: (c.allowedPickups ?? []).map((ap: any) => ({
        id: ap?._id?.toString?.() ?? ap?.toString?.() ?? '',
        name: ap?.name ?? '',
        phone: ap?.phone ?? '',
      })),
    })),
    totalInside: checkIns.filter((c: any) => !c.checkOutTime).length,
    totalOut: checkIns.filter((c: any) => !!c.checkOutTime).length,
  }
})