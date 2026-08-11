import { Caregiver } from '~~/server/models/Caregiver'
import { Child } from '~~/server/models/Child'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { buildSearchFilter } from '~~/server/utils/search'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_READ)

  const query = getQuery(event)
  const q = (query.q as string) || ''
  const limit = parseInt(query.limit as string) || 10

  const filter: Record<string, any> = {}
  if (q) {
    const searchFilter = buildSearchFilter(q, ['name', 'phone'])
    if (searchFilter) Object.assign(filter, searchFilter)
  }

  const caregivers = await Caregiver.find(filter).limit(limit).lean()

  // Para cada acudiente, buscar sus niños asociados
  const results = []
  for (const cg of caregivers) {
    const children = await Child.find({ 'caregivers.caregiver': cg._id })
      .select('name birthDate')
      .lean()

    results.push({
      id: cg._id.toString(),
      name: cg.name,
      phone: cg.phone,
      children: children.map((child) => {
        // Encontrar la relación del acudiente con este niño
        const rel = (child.caregivers ?? []).find(
          (c: any) => c.caregiver?.toString?.() === cg._id.toString()
        )
        return {
          id: child._id.toString(),
          name: child.name,
          birthDate: child.birthDate,
          relationship: rel?.relationship ?? '',
        }
      }),
    })
  }

  return { items: results }
})