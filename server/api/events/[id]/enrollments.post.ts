import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { Person } from '~~/server/models/Person'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createEnrollmentSchema = z.object({
  personId: z.string().min(1, 'La persona que asistirá es requerida'),
  enrolledById: z.string().min(1, 'La persona que inscribe es requerida'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ENROLLMENTS_CREATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const body = await readBody(event)
  const result = createEnrollmentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de pre-inscripción fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { personId, enrolledById } = result.data

  // Validar personas
  const [person, enrolledBy] = await Promise.all([
    Person.findById(personId),
    Person.findById(enrolledById),
  ])
  if (!person) {
    throw createError({ statusCode: 400, statusMessage: 'La persona que asistirá no existe' })
  }
  if (!enrolledBy) {
    throw createError({ statusCode: 400, statusMessage: 'La persona que inscribe no existe' })
  }

  // No permitir pre-inscripción duplicada registrada
  const existing = await EventEnrollment.findOne({
    event: eventDoc._id,
    person: person._id,
    status: 'registered',
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Esta persona ya está pre-inscrita a este evento' })
  }

  const enrollment = await EventEnrollment.create({
    event: eventDoc._id,
    person: person._id,
    enrolledBy: enrolledBy._id,
    status: 'registered',
  })

  return {
    id: enrollment._id.toString(),
    eventId: eventDoc._id.toString(),
    personId: person._id.toString(),
    enrolledById: enrolledBy._id.toString(),
    status: enrollment.status,
    registeredAt: enrollment.registeredAt,
  }
})