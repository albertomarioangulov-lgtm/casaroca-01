import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MEMBERSHIPS_READ)

  const query = getQuery(event)
  const ministryId = (query.ministryId as string) || ''
  const personId = (query.personId as string) || ''
  const roleInMinistry = (query.roleInMinistry as string) || ''
  const status = (query.status as string) || 'active'

  const filter: Record<string, any> = {}
  if (ministryId) filter.ministry = ministryId
  if (personId) filter.person = personId
  if (roleInMinistry) filter.roleInMinistry = roleInMinistry
  if (status) filter.status = status

  const memberships = await MinistryMembership.find(filter)
    .populate('person', 'name phone email gender birthDate')
    .populate('ministry', 'name code color icon')
    .populate('invitation', 'status invitedAt respondedAt')
    .sort({ joinedAt: -1 })
    .lean()

  return {
    items: memberships.map((m: any) => ({
      id: m._id.toString(),
      personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
      personName: m.person?.name ?? '',
      personPhone: m.person?.phone ?? '',
      ministryId: m.ministry?._id?.toString?.() ?? m.ministry?.toString?.() ?? '',
      ministryName: m.ministry?.name ?? '',
      ministryCode: m.ministry?.code ?? '',
      ministryColor: m.ministry?.color ?? '',
      ministryIcon: m.ministry?.icon ?? '',
      roleInMinistry: m.roleInMinistry,
      source: m.source,
      invitationId: m.invitation?._id?.toString?.() ?? m.invitation?.toString?.() ?? '',
      invitationStatus: m.invitation?.status ?? '',
      joinedAt: m.joinedAt,
      status: m.status,
      specialties: (m.specialties ?? []).map((s: any) => s.toString()),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    total: memberships.length,
  }
})