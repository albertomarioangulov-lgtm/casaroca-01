import { z } from 'zod'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { CourseSession } from '~~/server/models/CourseSession'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const attendanceEntrySchema = z.object({
  personId: z.string().min(1, 'La persona es requerida'),
  present: z.boolean().default(true),
})

const createAttendanceSchema = z.object({
  sessionId: z.string().min(1, 'La sesión es requerida'),
  attendees: z.array(attendanceEntrySchema).min(1, 'Debe registrar al menos un asistente'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.COURSE_ATTENDANCE_CREATE)

  const body = await readBody(event)
  const result = createAttendanceSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de asistencia fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { sessionId, attendees } = result.data

  // Validar sesión
  const session = await CourseSession.findById(sessionId)
  if (!session) {
    throw createError({ statusCode: 400, statusMessage: 'La sesión no existe' })
  }

  // Validar personas y crear asistencia (bulk upsert)
  const records = []
  for (const att of attendees) {
    const person = await Person.findById(att.personId)
    if (!person) {
      throw createError({ statusCode: 400, statusMessage: `La persona ${att.personId} no existe` })
    }
    records.push({
      session: session._id,
      person: person._id,
      present: att.present,
    })
  }

  // Usar bulkWrite con upsert para no duplicar registros
  await CourseAttendance.bulkWrite(
    records.map((record) => ({
      updateOne: {
        filter: { session: session._id, person: record.person },
        update: { $set: { present: record.present } },
        upsert: true,
      },
    }))
  )

  // Obtener los registros resultantes
  const personIds = records.map((r) => r.person)
  const saved = await CourseAttendance.find({
    session: session._id,
    person: { $in: personIds },
  })
    .populate('person', 'name phone')
    .lean()

  return {
    items: saved.map((a: any) => ({
      id: a._id.toString(),
      sessionId: session._id.toString(),
      personId: a.person?._id?.toString?.() ?? a.person?.toString?.() ?? '',
      personName: a.person?.name ?? '',
      present: a.present,
      createdAt: a.createdAt,
    })),
    total: saved.length,
  }
})