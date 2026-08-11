import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  description: z.string().nullable().optional(),
  date: z.string().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  ministryId: z.string().nullable().optional(),
  parentEventId: z.string().nullable().optional(),
  welcomeEnabled: z.boolean().optional(),
  activateChildren: z.boolean().optional(), // al activar un evento principal, activa también sus satélites
  type: z.enum(['regular', 'welcome', 'baptism', 'outreach']).optional(),
  status: z.enum(['scheduled', 'active', 'finished', 'cancelled']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const body = await readBody(event)
  const result = updateEventSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de evento fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  if ('date' in updateData && updateData.date) {
    updateData.date = new Date(updateData.date)
  }
  for (const field of ['description', 'startTime', 'endTime', 'location']) {
    if (field in updateData && !updateData[field]) {
      updateData[field] = undefined
    }
  }
  if ('ministryId' in updateData) {
    const ministryId = updateData.ministryId
    delete updateData.ministryId
    if (ministryId) {
      const ministry = await Ministry.findById(ministryId)
      if (!ministry) {
        throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
      }
      updateData.ministry = ministry._id
    } else {
      updateData.ministry = undefined
    }
  }
  if ('parentEventId' in updateData) {
    const parentEventId = updateData.parentEventId
    delete updateData.parentEventId
    if (parentEventId) {
      if (parentEventId === id) {
        throw createError({ statusCode: 400, statusMessage: 'Un evento no puede ser padre de sí mismo' })
      }
      const parentEvent = await Event.findById(parentEventId)
      if (!parentEvent) {
        throw createError({ statusCode: 400, statusMessage: 'El evento padre no existe' })
      }
      if (parentEvent.parentEvent) {
        throw createError({ statusCode: 400, statusMessage: 'Un evento satélite no puede ser padre de otro evento' })
      }
      updateData.parentEvent = parentEvent._id
    } else {
      updateData.parentEvent = undefined
    }
  }

  // Evitar duplicados: un evento principal no puede tener dos satélites del mismo ministerio
  if (updateData.parentEvent && updateData.ministry) {
    const duplicate = await Event.findOne({
      parentEvent: updateData.parentEvent,
      ministry: updateData.ministry,
      _id: { $ne: id },
    })
    if (duplicate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Este evento principal ya tiene un ministerio vinculado con ese mismo ministerio.',
      })
    }
  }

  // Reglas de activación:
  // - Un evento satélite solo puede activarse si su padre está 'active'.
  // - Al activar un principal con activateChildren=true, se activan sus satélites en cascada.
  const activateChildren = result.data.activateChildren ?? false

  const currentEvent = await Event.findById(id).lean()
  if (!currentEvent) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Si el evento se está activando y aún no tiene snapshot de salones, congelarlo
  // desde el ministerio (para los eventos creados antes de esta funcionalidad).
  const newStatus2 = updateData.status ?? currentEvent.status
  if (newStatus2 === 'active' && currentEvent.ministry && !currentEvent.ageGroupsSnapshot?.length) {
    const ministry = await Ministry.findById(currentEvent.ministry).lean()
    if (ministry?.ageGroups?.length) {
      updateData.ageGroupsSnapshot = ministry.ageGroups as any
    }
  }

  const newStatus = updateData.status ?? currentEvent.status

  if (newStatus === 'active' && currentEvent.status !== 'active' && currentEvent.parentEvent) {
    const parentEvent = await Event.findById(currentEvent.parentEvent).lean()
    if (!parentEvent) {
      throw createError({ statusCode: 400, statusMessage: 'El evento padre no existe' })
    }
    if (parentEvent.status !== 'active') {
      throw createError({
        statusCode: 400,
        statusMessage: `Debes activar primero el evento principal: ${parentEvent.name}`,
      })
    }
  }

  const eventDoc = await Event.findByIdAndUpdate(id, updateData, { new: true })
    .populate('ministry', 'name code color icon')
    .populate('parentEvent', 'name')
    .lean()

  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Si se activó un evento principal y activateChildren=true, activar sus satélites en cascada
  let activatedChildren: string[] = []
  if (eventDoc.status === 'active' && activateChildren && !eventDoc.parentEvent) {
    const childEvents = await Event.find({ parentEvent: id, status: 'scheduled' }).select('_id name')
    if (childEvents.length > 0) {
      await Event.updateMany(
        { parentEvent: id, status: 'scheduled' },
        { $set: { status: 'active' } }
      )
      activatedChildren = childEvents.map((c: any) => c.name)
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
    ministryId: (eventDoc.ministry as any)?._id?.toString?.() ?? (eventDoc.ministry as any)?.toString?.() ?? '',
    ministryName: (eventDoc.ministry as any)?.name ?? '',
    parentEventId: (eventDoc.parentEvent as any)?._id?.toString?.() ?? (eventDoc.parentEvent as any)?.toString?.() ?? '',
    parentEventName: (eventDoc.parentEvent as any)?.name ?? '',
    welcomeEnabled: eventDoc.welcomeEnabled ?? true,
    activatedChildren,
    type: eventDoc.type,
    status: eventDoc.status,
    createdAt: eventDoc.createdAt,
    updatedAt: eventDoc.updatedAt,
  }
})
