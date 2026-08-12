import { z } from 'zod'
import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateStatusSchema = z.object({
  status: z.enum(['active', 'no_interested', 'stopped']),
  reason: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const body = await readBody(event)
  const result = updateStatusSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de estado fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const card = await WelcomeCard.findById(id)
  if (!card) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  const { status, reason } = result.data

  const updates: Record<string, any> = {
    followUpStatus: status,
  }

  if (status === 'active') {
    // Reanudar: limpiar datos de detención
    updates.followUpStoppedAt = null
    updates.followUpStoppedReason = null
  } else {
    // Detener (no interesado o manual)
    updates.followUpStoppedAt = new Date()
    updates.followUpStoppedReason = reason || undefined
  }

  await WelcomeCard.findByIdAndUpdate(id, updates)

  return {
    cardId: id,
    followUpStatus: status,
    followUpStoppedAt: updates.followUpStoppedAt ?? null,
    followUpStoppedReason: updates.followUpStoppedReason ?? '',
  }
})