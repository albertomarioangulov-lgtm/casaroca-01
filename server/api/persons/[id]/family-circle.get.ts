import { Person } from '~~/server/models/Person'
import { Family } from '~~/server/models/Family'
import { Relationship } from '~~/server/models/Relationship'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

function getAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PERSONS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const person = await Person.findById(id).select('name').lean()
  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }

  // Recolectar IDs del círculo familiar (sin duplicados, sin self)
  const circleIds = new Set<string>()

  // 1) Miembros de las mismas familias/hogares
  const families = await Family.find({ 'members.person': id }).lean()
  for (const fam of families as any[]) {
    for (const member of fam.members ?? []) {
      const memberId = member.person?.toString?.()
      if (!memberId || memberId === id) continue
      circleIds.add(memberId)
    }
  }

  // 2) Relaciones directas (ambas direcciones)
  const relationships = await Relationship.find({
    $or: [{ person: id }, { relatedPerson: id }],
  }).lean()
  for (const rel of relationships as any[]) {
    const origin = rel.person?.toString?.()
    const target = rel.relatedPerson?.toString?.()
    if (origin && origin !== id) circleIds.add(origin)
    if (target && target !== id) circleIds.add(target)
  }

  // Cargar datos de los miembros del círculo
  const members = await Person.find({ _id: { $in: Array.from(circleIds) } })
    .select('name phone birthDate gender email')
    .lean()

  // Construir resultado con relación vs la persona consultada
  const items = members.map((m: any) => {
    const mId = m._id.toString()

    // Encontrar la relación desde el hogar
    let familyRole = ''
    for (const fam of families as any[]) {
      const member = (fam.members ?? []).find((mm: any) => mm.person?.toString?.() === mId)
      if (member?.roleInFamily) {
        familyRole = member.roleInFamily
        break
      }
    }

    // Encontrar la relación directa
    let relType = ''
    for (const rel of relationships as any[]) {
      const origin = rel.person?.toString?.()
      const target = rel.relatedPerson?.toString?.()
      if (origin === mId || target === mId) {
        relType = rel.relationshipType || ''
        break
      }
    }

    const birthDate = m.birthDate ? new Date(m.birthDate) : null
    const age = birthDate ? getAge(birthDate) : null

    return {
      id: mId,
      name: m.name ?? '',
      phone: m.phone ?? '',
      email: m.email ?? '',
      birthDate: m.birthDate ?? null,
      age,
      // relationship examples: 'hijo', 'madre', 'abuelo', etc.
      relationship: familyRole || relType || '',
      sources: {
        family: !!familyRole,
        relationship: !!relType,
      },
    }
  })

  // Ordenar: primero los que tienen relación conocida, luego por nombre
  items.sort((a: any, b: any) => {
    if (!!a.relationship !== !!b.relationship) return a.relationship ? -1 : 1
    return (a.name || '').localeCompare(b.name || '')
  })

  return {
    items,
    total: items.length,
  }
})