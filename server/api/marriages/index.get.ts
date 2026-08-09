import { Marriage } from '~~/server/models/Marriage'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MARRIAGES_READ)

  const query = getQuery(event)
  const status = (query.status as string) || ''
  const personId = (query.personId as string) || ''

  const filter: Record<string, any> = {}
  if (status) filter.status = status
  if (personId) {
    filter.$or = [{ spouse1: personId }, { spouse2: personId }]
  }

  const marriages = await Marriage.find(filter)
    .populate('spouse1', 'name phone email birthDate gender')
    .populate('spouse2', 'name phone email birthDate gender')
    .sort({ marriageDate: -1 })
    .lean()

  return {
    items: marriages.map((m: any) => ({
      id: m._id.toString(),
      spouse1: {
        id: m.spouse1?._id?.toString?.() ?? m.spouse1?.toString?.() ?? '',
        name: m.spouse1?.name ?? '',
        phone: m.spouse1?.phone ?? '',
      },
      spouse2: {
        id: m.spouse2?._id?.toString?.() ?? m.spouse2?.toString?.() ?? '',
        name: m.spouse2?.name ?? '',
        phone: m.spouse2?.phone ?? '',
      },
      marriageDate: m.marriageDate,
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    total: marriages.length,
  }
})