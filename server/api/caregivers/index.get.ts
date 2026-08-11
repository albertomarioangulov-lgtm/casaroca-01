import { Caregiver } from '~~/server/models/Caregiver'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { buildSearchFilter } from '~~/server/utils/search'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_READ)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1

  const filter: Record<string, any> = {}
  if (search) {
    const searchFilter = buildSearchFilter(search, ['name', 'phone'])
    if (searchFilter) Object.assign(filter, searchFilter)
  }

  const total = await Caregiver.countDocuments(filter)
  const caregivers = await Caregiver.find(filter)
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: caregivers.map((cg) => ({
      id: cg._id?.toString?.() ?? '',
      name: cg.name,
      phone: cg.phone,
      createdAt: cg.createdAt,
      updatedAt: cg.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})