import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const checkoutSchema = z.object({
  wristbandNumber: z.string().trim().optional(), // Obligatorio en RocaKids o si el evento requiere manilla
  caregiverId: z.string().optional(), // Obligatorio en RocaKids (quién recoge autorizado)
})

// ¿El evento pertenece al ministerio de niños (RocaKids/RokaKids)?
const isKidsEvent = (ministryName: string, ministryCode: string): boolean => {
  const name = (ministryName || '').toLowerCase()
  const code = (ministryCode || '').toLowerCase()
  return /roca\s*kids/.test(name) || /roca\s*kids/.test(code) || code === 'rokakids' || code === 'rocakids'
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHECKINS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de check-in requerido' })
  }

  const body = await readBody(event)
  const result = checkoutSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de salida fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { wristbandNumber, caregiverId } = result.data

  const checkIn = await EventCheckIn.findById(id)
  if (!checkIn) {
    throw createError({ statusCode: 404, statusMessage: 'Registro de ingreso no encontrado' })
  }

  // Validar que la persona no haya salido ya
  if (checkIn.checkOutTime) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta persona ya fue entregada a la salida',
    })
  }

  // Cargar el evento para conocer su configuración de salida/manilla
  const eventDoc = await Event.findById(checkIn.event)
    .populate('ministry', 'name code')
    .lean()

  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const ministry = (eventDoc as any).ministry as any
  const kidsEvent = isKidsEvent(ministry?.name ?? '', ministry?.code ?? '')
  // RocaKids siempre requiere manilla (incluso eventos antiguos sin el flag)
  const requireWristband = kidsEvent || !!((eventDoc as any).requireWristband ?? false)

  // ========================================================================
  // Validaciones específicas según el tipo de evento
  // ========================================================================
  if (requireWristband) {
    if (!wristbandNumber?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'El número de manilla es requerido' })
    }
    if (checkIn.wristbandNumber !== wristbandNumber.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El número de manilla no coincide con el registro',
      })
    }
  }

  if (kidsEvent) {
    // En RocaKids, quien recoge debe ser el acudiente que dejó al niño o uno autorizado
    if (!caregiverId) {
      throw createError({ statusCode: 400, statusMessage: 'La persona que recoge es requerida' })
    }
    const caregiverIdStr = checkIn.caregiver?.toString?.() ?? ''
    const allowedPickups = (checkIn.allowedPickups ?? []).map((idp: any) => idp.toString())

    if (caregiverId !== caregiverIdStr && !allowedPickups.includes(caregiverId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'La persona que recoge no es el acudiente autorizado',
      })
    }
  }

  // Registrar la salida
  checkIn.checkOutTime = new Date()
  await checkIn.save()

  return {
    success: true,
    id: checkIn._id.toString(),
    personId: checkIn.person.toString(),
    checkInTime: checkIn.checkInTime,
    checkOutTime: checkIn.checkOutTime,
  }
})