import { Invitation } from '~~/server/models/Invitation'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.INVITATIONS_READ)

  const query = getQuery(event)
  const ministryId = (query.ministryId as string) || ''
  const personId = (query.personId as string) || ''
  const status = (query.status as string) || ''
  const invitedBy = (query.invitedBy as string) || ''

  const filter: Record<string, any> = {}
  if (ministryId) filter.ministry = ministryId
  if (personId) filter.person = personId
  if (status) filter.status = status
  if (invitedBy) filter.invitedBy = invitedBy

  const invitations = await Invitation.find(filter)
    .populate('person', 'name phone email')
    .populate('ministry', 'name code color icon')
    .populate('event', 'name date')
    .populate('invitedBy', 'name email')
    .sort({ invitedAt: -1 })
    .lean()

  return {
    items: invitations.map((inv: any) => ({
      id: inv._id.toString(),
      personId: inv.person?._id?.toString?.() ?? inv.person?.toString?.() ?? '',
      personName: inv.person?.name ?? '',
      personPhone: inv.person?.phone ?? '',
      ministryId: inv.ministry?._id?.toString?.() ?? inv.ministry?.toString?.() ?? '',
      ministryName: inv.ministry?.name ?? '',
      ministryCode: inv.ministry?.code ?? '',
      ministryColor: inv.ministry?.color ?? '',
      eventId: inv.event?._id?.toString?.() ?? inv.event?.toString?.() ?? '',
      eventName: inv.event?.name ?? '',
      eventDate: inv.event?.date ?? null,
      invitedById: inv.invitedBy?._id?.toString?.() ?? inv.invitedBy?.toString?.() ?? '',
      invitedByName: inv.invitedBy?.name ?? '',
      channel: inv.channel,
      message: inv.message,
      status: inv.status,
      invitedAt: inv.invitedAt,
      respondedAt: inv.respondedAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    })),
    total: invitations.length,
  }
})