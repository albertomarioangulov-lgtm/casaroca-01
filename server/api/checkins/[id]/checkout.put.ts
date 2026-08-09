import { z } from 'zod'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const checkoutSchema = z.object({
  wristbandNumber: z.string().trim().min(1, 'El número de manilla es requerido'),
  caregiverId: z.string().min(1, 'La persona que recoge es requerida'),
})

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

  // Validar que el número de manilla coincida
  if (checkIn.wristbandNumber !== wristbandNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El número de manilla no coincide con el registro',
    })
  }

  // Validar que el niño no haya salido ya
  if (checkIn.checkOutTime) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este niño ya fue entregado a la salida',
    })
  }

  // Validar que quien recoge es el acudiente que dejó al niño o uno autorizado
  const caregiverIdStr = checkIn.caregiver?.toString?.() ?? ''
  const allowedPickups = (checkIn.allowedPickups ?? []).map((idp: any) => idp.toString())

  if (caregiverId !== caregiverIdStr && !allowedPickups.includes(caregiverId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La persona que recoge no es el acudiente autorizado',
    })
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