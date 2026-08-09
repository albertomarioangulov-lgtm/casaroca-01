import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_READ)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1
  const visitorType = (query.visitorType as string) || ''
  const eventId = (query.eventId as string) || ''
  const campus = (query.campus as string) || ''

  const filter: Record<string, any> = {}
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }
  if (visitorType) filter.visitorType = visitorType
  if (eventId) filter.event = eventId
  if (campus) filter.campus = campus

  const total = await WelcomeCard.countDocuments(filter)
  const cards = await WelcomeCard.find(filter)
    .populate('person', 'name phone email')
    .populate('event', 'name date')
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: cards.map((c: any) => ({
      id: c._id?.toString?.() ?? '',
      personId: c.person?._id?.toString?.() ?? c.person?.toString?.() ?? '',
      personName: c.person?.name ?? '',
      eventId: c.event?._id?.toString?.() ?? c.event?.toString?.() ?? '',
      eventName: c.event?.name ?? '',
      eventDate: c.event?.date ?? null,
      registrationDate: c.registrationDate,
      visitorType: c.visitorType,
      name: c.name,
      email: c.email,
      phone: c.phone,
      motivations: c.motivations ?? [],
      motivationOther: c.motivationOther ?? '',
      acceptedJesus: c.acceptedJesus ?? '',
      connectionInterest: c.connectionInterest ?? '',
      wantsOtherCampus: c.wantsOtherCampus ?? '',
      campus: c.campus ?? '',
      followUpInterests: c.followUpInterests ?? [],
      affinityGroup: c.affinityGroup ?? '',
      spouseName: c.spouseName ?? '',
      registrationOrigin: c.registrationOrigin ?? '',
      prayerRequest: c.prayerRequest ?? '',
      acceptsDataPolicy: c.acceptsDataPolicy ?? '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})