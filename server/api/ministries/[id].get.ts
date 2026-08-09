import { Ministry } from '~~/server/models/Ministry'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { MinistryRole } from '~~/server/models/MinistryRole'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRIES_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de ministerio requerido' })
  }

  const ministry = await Ministry.findById(id).lean()
  if (!ministry) {
    throw createError({ statusCode: 404, statusMessage: 'Ministerio no encontrado' })
  }

  const [activeMemberships, leaderCount, roles] = await Promise.all([
    MinistryMembership.countDocuments({ ministry: ministry._id, status: 'active' }),
    MinistryMembership.countDocuments({
      ministry: ministry._id,
      status: 'active',
      roleInMinistry: { $in: ['leader', 'director'] },
    }),
    MinistryRole.find({ ministry: ministry._id, isActive: true }).sort({ name: 1 }).lean(),
  ])

  return {
    id: ministry._id.toString(),
    name: ministry.name,
    code: ministry.code,
    description: ministry.description,
    eligibilityType: ministry.eligibilityType,
    minAge: ministry.minAge,
    maxAge: ministry.maxAge,
    gender: ministry.gender,
    maritalStatus: ministry.maritalStatus,
    icon: ministry.icon,
    color: ministry.color,
    isActive: ministry.isActive,
    memberCount: activeMemberships,
    leaderCount,
    roles: roles.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      isActive: r.isActive,
    })),
    createdAt: ministry.createdAt,
    updatedAt: ministry.updatedAt,
  }
})