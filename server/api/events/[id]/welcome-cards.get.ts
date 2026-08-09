import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  // Consulta ligera e indexada: filtra por evento y devuelve solo los campos de la tabla
  const cards = await WelcomeCard.find({ event: id })
    .select('name email phone visitorType motivations registrationDate createdAt')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()

  return {
    items: cards.map((c: any) => ({
      id: c._id?.toString?.() ?? '',
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      visitorType: c.visitorType ?? '',
      motivations: c.motivations ?? [],
      registrationDate: c.registrationDate ?? null,
      createdAt: c.createdAt ?? null,
    })),
  }
})