import { Event } from '~~/server/models/Event'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { buildSearchFilter } from '~~/server/utils/search'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.EVENTS_READ)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'date'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1
  const ministryId = (query.ministryId as string) || ''
  const type = (query.type as string) || ''
  const status = (query.status as string) || ''
  const parentEventId = (query.parentEvent as string) || ''
  const showChildren = (query.showChildren as string) === '1'

  const filter: Record<string, any> = {}
  if (search) {
    const searchFilter = buildSearchFilter(search, ['name'])
    if (searchFilter) Object.assign(filter, searchFilter)
  }
  // Eventos satélite se ocultan por defecto en el listado general
  if (parentEventId) {
    filter.parentEvent = parentEventId
  } else if (!showChildren) {
    filter.parentEvent = null
  }
  if (ministryId) filter.ministry = ministryId
  if (type) filter.type = type
  if (status) {
    const statuses = status.split(',').filter(Boolean)
    if (statuses.length > 1) filter.status = { $in: statuses }
    else if (statuses.length === 1) filter.status = statuses[0]
  }

  const total = await Event.countDocuments(filter)
  const events = await Event.find(filter)
    .populate('ministry', 'name code color icon')
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: events.map((ev: any) => ({
      id: ev._id?.toString?.() ?? '',
      name: ev.name,
      description: ev.description,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      location: ev.location,
      ministryId: ev.ministry?._id?.toString?.() ?? ev.ministry?.toString?.() ?? '',
      ministryName: ev.ministry?.name ?? '',
      ministryColor: ev.ministry?.color ?? '',
      ministryIcon: ev.ministry?.icon ?? '',
      type: ev.type,
      status: ev.status,
      parentEventId: ev.parentEvent?.toString?.() ?? '',
      welcomeEnabled: ev.welcomeEnabled ?? true,
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})