import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const card = await WelcomeCard.findByIdAndDelete(id)

  if (!card) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  return {
    id: card._id.toString(),
    deleted: true,
  }
})