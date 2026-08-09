import { Child } from '~~/server/models/Child'
import { Caregiver } from '~~/server/models/Caregiver'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHILDREN_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de niño requerido' })
  }

  const child = await Child.findById(id)
    .populate('caregivers.caregiver', 'name phone')
    .lean()

  if (!child) {
    throw createError({ statusCode: 404, statusMessage: 'Niño no encontrado' })
  }

  // Historial de eventos del niño
  const checkIns = await EventCheckIn.find({ childId: id })
    .populate('eventId', 'name date')
    .populate('caregiverId', 'name phone')
    .sort({ checkInTime: -1 })
    .limit(50)
    .lean()

  const history = (checkIns as any[]).map((ci) => ({
    id: ci._id?.toString?.() ?? '',
    eventId: ci.eventId?._id?.toString?.() ?? ci.eventId?.toString?.() ?? '',
    eventName: ci.eventId?.name ?? '',
    eventDate: ci.eventId?.date ?? null,
    checkInTime: ci.checkInTime,
    checkOutTime: ci.checkOutTime,
    wristbandNumber: ci.wristbandNumber,
    caregiver: {
      id: ci.caregiverId?._id?.toString?.() ?? ci.caregiverId?.toString?.() ?? '',
      name: ci.caregiverId?.name ?? '',
      phone: ci.caregiverId?.phone ?? '',
    },
  }))

  return {
    id: child._id.toString(),
    name: child.name,
    birthDate: child.birthDate,
    createdAt: child.createdAt,
    updatedAt: child.updatedAt,
    caregivers: (child.caregivers ?? []).map((cg: any) => ({
      id: cg.caregiver?._id?.toString?.() ?? cg.caregiver?.toString?.() ?? '',
      name: cg.caregiver?.name ?? '',
      phone: cg.caregiver?.phone ?? '',
      relationship: cg.relationship,
    })),
    history,
  }
})