import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  ministryId: z.string().optional(),
  parentEventId: z.string().optional(),
  includeRokaKids: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  type: z.enum(['regular', 'welcome', 'baptism', 'outreach']).optional(),
  status: z.enum(['scheduled', 'active', 'finished', 'cancelled']).optional(),
})

// Validar que el evento padre exista y no sea a su vez un evento satélite
async function validateParentEvent(parentEventId?: string) {
  if (!parentEventId) return
  const parentEvent = await Event.findById(parentEventId)
  if (!parentEvent) {
    throw createError({ statusCode: 400, statusMessage: 'El evento padre no existe' })
  }
  if (parentEvent.parentEvent) {
    throw createError({ statusCode: 400, statusMessage: 'Un evento satélite no puede ser padre de otro evento' })
  }
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_CREATE)

  const body = await readBody(event)
  const result = createEventSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de evento fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, description, date, startTime, endTime, location, ministryId, parentEventId, includeRokaKids, welcomeEnabled, type, status } = result.data

  // Validar ministerio si se envía
  if (ministryId) {
    const ministry = await Ministry.findById(ministryId)
    if (!ministry) {
      throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
    }
  }

  // Validar evento padre si se envía
  await validateParentEvent(parentEventId)

  const eventDoc = await Event.create({
    name,
    description,
    date: new Date(date),
    startTime,
    endTime,
    location,
    ministry: ministryId || undefined,
    parentEvent: parentEventId || undefined,
    welcomeEnabled: welcomeEnabled ?? true,
    type: type ?? 'regular',
    status: status ?? 'scheduled',
  })

  // Crear satélite de niños automáticamente si se solicita.
  // Búsqueda flexible: el ministerio puede llamarse "RocaKids"/"RokaKids"
  // con código 'rocakids'/'rokakids' o similar.
  let childEventId: string | null = null
  let warning: string | null = null
  if (includeRokaKids && !parentEventId) {
    const kidsMinistry = await Ministry.findOne({
      $or: [
        { code: 'rokakids' },
        { code: 'rocakids' },
        { name: { $regex: /roca\s*kids/i } },
        { code: { $regex: /roca\s*kids/i } },
      ],
    })
    if (!kidsMinistry) {
      warning = 'El evento se creó correctamente, pero no se pudo generar el servicio de niños porque no se encontró el ministerio RocaKids. Créalo en Ministerios y luego usa "Crear satélite RocaKids" en la página del evento.'
    } else {
      const childEvent = await Event.create({
        name: `${name} — ${kidsMinistry.name}`,
        date: new Date(date),
        startTime,
        endTime,
        location,
        ministry: kidsMinistry._id,
        parentEvent: eventDoc._id,
        welcomeEnabled: false, // los niños no llenan tarjetas
        type: 'regular',
        status: status ?? 'scheduled',
      })
      childEventId = childEvent._id.toString()
    }
  }

  return {
    id: eventDoc._id.toString(),
    name: eventDoc.name,
    description: eventDoc.description,
    date: eventDoc.date,
    startTime: eventDoc.startTime,
    endTime: eventDoc.endTime,
    location: eventDoc.location,
    ministryId: eventDoc.ministry?.toString?.() ?? null,
    parentEventId: eventDoc.parentEvent?.toString?.() ?? null,
    welcomeEnabled: eventDoc.welcomeEnabled,
    childEventId,
    warning,
    type: eventDoc.type,
    status: eventDoc.status,
    createdAt: eventDoc.createdAt,
  }
})
