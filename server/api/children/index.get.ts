import { Child } from '~~/server/models/Child'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHILDREN_READ)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1

  const filter: Record<string, any> = {}
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
    ]
  }

  const total = await Child.countDocuments(filter)
  const children = await Child.find(filter)
    .populate('caregivers.caregiver', 'name phone')
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: children.map((child) => ({
      id: child._id?.toString?.() ?? '',
      name: child.name,
      birthDate: child.birthDate,
      caregivers: (child.caregivers ?? []).map((cg: any) => ({
        id: cg.caregiver?._id?.toString?.() ?? cg.caregiver?.toString?.() ?? '',
        name: cg.caregiver?.name ?? '',
        phone: cg.caregiver?.phone ?? '',
        relationship: cg.relationship,
      })),
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})