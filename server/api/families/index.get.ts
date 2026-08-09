import { Family } from '~~/server/models/Family'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_READ)

  const families = await Family.find()
    .populate('members.person', 'name phone email birthDate gender')
    .sort({ name: 1 })
    .lean()

  return {
    items: families.map((f: any) => ({
      id: f._id.toString(),
      name: f.name,
      members: (f.members ?? []).map((m: any) => ({
        personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
        name: m.person?.name ?? '',
        roleInFamily: m.roleInFamily,
      })),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    total: families.length,
  }
})