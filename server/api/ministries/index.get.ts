import { Ministry } from '~~/server/models/Ministry'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRIES_READ)

  const ministries = await Ministry.find().sort({ name: 1 }).lean()

  const items = await Promise.all(ministries.map(async (m) => {
    const activeMemberships = await MinistryMembership.countDocuments({
      ministry: m._id,
      status: 'active',
    })
    const leaders = await MinistryMembership.countDocuments({
      ministry: m._id,
      status: 'active',
      roleInMinistry: { $in: ['leader', 'director'] },
    })

    return {
      id: m._id.toString(),
      name: m.name,
      code: m.code,
      description: m.description,
      eligibilityType: m.eligibilityType,
      minAge: m.minAge,
      maxAge: m.maxAge,
      gender: m.gender,
      maritalStatus: m.maritalStatus,
      icon: m.icon,
      color: m.color,
      isActive: m.isActive,
      memberCount: activeMemberships,
      leaderCount: leaders,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }
  }))

  return { items, total: items.length }
})