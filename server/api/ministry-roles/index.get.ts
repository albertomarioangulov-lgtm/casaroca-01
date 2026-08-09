import { MinistryRole } from '~~/server/models/MinistryRole'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRY_ROLES_READ)

  const query = getQuery(event)
  const ministryId = (query.ministryId as string) || ''

  const filter: Record<string, any> = {}
  if (ministryId) filter.ministry = ministryId

  const roles = await MinistryRole.find(filter)
    .populate('ministry', 'name code color icon')
    .sort({ name: 1 })
    .lean()

  return {
    items: roles.map((r: any) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      ministryId: r.ministry?._id?.toString?.() ?? r.ministry?.toString?.() ?? '',
      ministryName: r.ministry?.name ?? '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total: roles.length,
  }
})