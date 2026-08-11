import { Event } from '~~/server/models/Event'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { makeInMemorySearch } from '~~/server/utils/search'

// Calcular edad en años a partir de la fecha de nacimiento
function calcAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHECKINS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id).populate('ministry', 'name ageGroups').lean()
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Rangos de edad del ministerio (solo como fallback para eventos sin snapshot)
  const ministryAgeGroups = (eventDoc.ministry as any)?.ageGroups ?? []
  // Fuente de verdad histórica: los rangos congelados en ESTE evento
  const snapshotAgeGroups = (eventDoc as any).ageGroupsSnapshot?.length
    ? (eventDoc as any).ageGroupsSnapshot
    : ministryAgeGroups

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
    const matcher = makeInMemorySearch(search, (c: any) => [
      c.person?.name ?? '',
      c.caregiver?.name ?? '',
      c.wristbandNumber ?? '',
    ])
    if (matcher) {
      items = items.filter(matcher)
    }
  }

  return {
    items: items.map((c: any) => {
      const birthDate = c.person?.birthDate ?? null
      const age = birthDate ? calcAge(new Date(birthDate)) : null

      // Resolver el salón: usar el índice guardado en el check-in contra el snapshot
      // del evento (histórico fiel). Si no hay índice, calcular por edad (fallback).
      let ageGroupName = 'Sin grupo'
      let ageGroupIndex = -1
      let ageGroupMinAge: number | null = null
      let ageGroupMaxAge: number | null = null

      if (c.ageGroupIndex !== undefined && c.ageGroupIndex >= 0 && snapshotAgeGroups[c.ageGroupIndex]) {
        const g = snapshotAgeGroups[c.ageGroupIndex]
        ageGroupName = g.name || 'Grupo'
        ageGroupIndex = c.ageGroupIndex
        ageGroupMinAge = g.minAge ?? null
        ageGroupMaxAge = g.maxAge ?? null
      } else if (age !== null && snapshotAgeGroups.length > 0) {
        const idx = snapshotAgeGroups.findIndex(
          (g: any) => age >= (g.minAge ?? 0) && age <= (g.maxAge ?? 999)
        )
        if (idx !== -1) {
          ageGroupName = snapshotAgeGroups[idx].name || 'Grupo'
          ageGroupIndex = idx
          ageGroupMinAge = snapshotAgeGroups[idx].minAge ?? null
          ageGroupMaxAge = snapshotAgeGroups[idx].maxAge ?? null
        }
      }

      return {
        id: c._id.toString(),
        eventId: id,
        personId: c.person?._id?.toString?.() ?? c.person?.toString?.() ?? '',
        personName: c.person?.name ?? '',
        personBirthDate: birthDate ?? null,
        age,
        ageGroupName,
        ageGroupIndex,
        ageGroupMinAge,
        ageGroupMaxAge,
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
      }
    }),
    totalInside: checkIns.filter((c: any) => !c.checkOutTime).length,
    totalOut: checkIns.filter((c: any) => !!c.checkOutTime).length,
  }
})