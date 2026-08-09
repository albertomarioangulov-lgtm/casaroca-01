import { Event } from '~~/server/models/Event'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_CREATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const parentEvent = await Event.findById(id)
  if (!parentEvent) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  if (parentEvent.parentEvent) {
    throw createError({ statusCode: 400, statusMessage: 'Un evento satélite no puede ser padre de otro evento' })
  }

  // Búsqueda flexible del ministerio de niños (RocaKids / RokaKids)
  const kidsMinistry = await Ministry.findOne({
    $or: [
      { code: 'rokakids' },
      { code: 'rocakids' },
      { name: { $regex: /roca\s*kids/i } },
      { code: { $regex: /roca\s*kids/i } },
    ],
  })
  if (!kidsMinistry) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se encontró el ministerio de niños (RocaKids). Créalo en Ministerios primero.',
    })
  }

  // Evitar duplicados: si ya existe un satélite de niños, no crear otro
  const existing = await Event.findOne({ parentEvent: id, ministry: kidsMinistry._id })
  if (existing) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Este evento ya tiene un servicio de niños vinculado.',
    })
  }

  const childEvent = await Event.create({
    name: `${parentEvent.name} — ${kidsMinistry.name}`,
    date: parentEvent.date,
    startTime: parentEvent.startTime,
    endTime: parentEvent.endTime,
    location: parentEvent.location,
    ministry: kidsMinistry._id,
    parentEvent: parentEvent._id,
    welcomeEnabled: false,
    type: 'regular',
    status: parentEvent.status,
  })

  return {
    id: childEvent._id.toString(),
    name: childEvent.name,
    parentEventId: parentEvent._id.toString(),
    ministryId: kidsMinistry._id.toString(),
    ministryName: kidsMinistry.name,
  }
})