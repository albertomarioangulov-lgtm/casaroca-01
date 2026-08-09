import { User } from '~~/server/models/User'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { getEndOfDay } from '~~/server/utils/dates'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.USERS_READ)

  const query = getQuery(event)
  const role = query.role as string | undefined
  const search = (query.search as string) || ''
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1

  const filter: Record<string, any> = {}
  if (role) {
    filter.roles = role
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  // Filtro por rango de fechas
  if (dateFrom || dateTo) {
    filter.createdAt = {}
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
    if (dateTo) filter.createdAt.$lte = getEndOfDay(dateTo)
  }

  const total = await User.countDocuments(filter)
  const users = await User.find(filter)
    .select('name email roles createdAt updatedAt')
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: users.map((user) => ({
      id: user._id?.toString?.() ?? '',
      name: user.name ?? 'Sin nombre',
      email: user.email,
      roles: user.roles ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})