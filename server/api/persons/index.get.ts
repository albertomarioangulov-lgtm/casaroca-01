import { Person } from '~~/server/models/Person'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Family } from '~~/server/models/Family'
import { Relationship } from '~~/server/models/Relationship'
import { Ministry } from '~~/server/models/Ministry'
import { Event } from '~~/server/models/Event'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { buildSearchFilter } from '~~/server/utils/search'

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

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 15
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) === 'asc' ? 1 : -1
  const ministryId = (query.ministryId as string) || ''
  const membershipStatus = (query.membershipStatus as string) || ''
  const gender = (query.gender as string) || ''
  const maritalStatus = (query.maritalStatus as string) || ''
  const isActive = query.isActive === 'false' ? false : undefined
  const includeRelatedKids = (query['related-kids'] as string) === '1'
  const eventId = (query.eventId as string) || ''

  // Rango de edad para filtrar niños (orden de prioridad):
  // 1. El ministerio del EVENTO (si el evento lo tiene y usa eligibilityType 'age')
  // 2. Fallback: ministerio con code 'rokakids'
  let kidAgeRange: { min: number; max: number } | null = null
  if (includeRelatedKids) {
    let ministryDoc: any = null

    if (eventId) {
      const eventDoc = await Event.findById(eventId).select('ministry').lean()
      if (eventDoc?.ministry) {
        ministryDoc = await Ministry.findById(eventDoc.ministry).lean()
      }
    }

    if (!ministryDoc) {
      ministryDoc = await Ministry.findOne({ code: 'rokakids', isActive: { $ne: false } }).lean()
    }

    if (
      ministryDoc?.eligibilityType === 'age' &&
      typeof ministryDoc.minAge === 'number' &&
      typeof ministryDoc.maxAge === 'number'
    ) {
      kidAgeRange = { min: ministryDoc.minAge, max: ministryDoc.maxAge }
    }
  }

  const filter: Record<string, any> = {}
  if (search) {
    const searchFilter = buildSearchFilter(search, ['name', 'phone', 'email'])
    if (searchFilter) Object.assign(filter, searchFilter)
  }
  if (gender) filter.gender = gender
  if (maritalStatus) filter.maritalStatus = maritalStatus
  if (isActive !== undefined) filter.isActive = isActive

  // Filtrar por ministerio: personas vinculadas o elegibles
  let personIds: string[] | null = null
  if (ministryId) {
    const membershipFilter: Record<string, any> = {
      ministry: ministryId,
      status: membershipStatus || 'active',
    }
    const memberships = await MinistryMembership.find(membershipFilter).select('person')
    personIds = memberships.map((m) => m.person.toString())
    filter._id = { $in: personIds }
  }

  const total = await Person.countDocuments(filter)
  const persons = await Person.find(filter)
    .sort({ [sortBy]: sortOrder } as any)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  // ===== Consultas globales (evita N+1 por persona) =====
  const foundIds = persons.map((p) => p._id?.toString?.() ?? '').filter(Boolean)

  // Membresías activas de todas las personas encontradas (1 sola consulta)
  const memberships = await MinistryMembership.find({
    person: { $in: foundIds },
    status: 'active',
  })
    .populate('ministry', 'name code color icon')
    .lean()

  const membershipsByPerson = new Map<string, any[]>()
  for (const m of memberships as any[]) {
    const pid = m.person?.toString?.() ?? ''
    if (!pid) continue
    if (!membershipsByPerson.has(pid)) membershipsByPerson.set(pid, [])
    membershipsByPerson.get(pid)!.push(m)
  }

  // Familias de todas las personas (1 sola consulta con populate)
  let familiesByPerson = new Map<string, any[]>()
  if (includeRelatedKids) {
    const allFamilies = await Family.find({ 'members.person': { $in: foundIds } })
      .populate('members.person', 'name birthDate gender')
      .lean()
    familiesByPerson = new Map<string, any[]>()
    for (const fam of allFamilies as any[]) {
      for (const member of fam.members ?? []) {
        const pid = member.person?._id?.toString?.() ?? member.person?.toString?.() ?? ''
        if (!pid) continue
        if (!familiesByPerson.has(pid)) familiesByPerson.set(pid, [])
        familiesByPerson.get(pid)!.push(fam)
      }
    }
  }

  // Relaciones de todas las personas (1 sola consulta con populate)
  let relationshipsByPerson = new Map<string, any[]>()
  if (includeRelatedKids) {
    const relationships = await Relationship.find({
      $or: [{ person: { $in: foundIds } }, { relatedPerson: { $in: foundIds } }],
    })
      .populate('relatedPerson', 'name birthDate gender')
      .populate('person', 'name birthDate gender')
      .lean()

    relationshipsByPerson = new Map<string, any[]>()
    for (const rel of relationships as any[]) {
      const origin = rel.person?._id?.toString?.() ?? rel.person?.toString?.() ?? ''
      const target = rel.relatedPerson?._id?.toString?.() ?? rel.relatedPerson?.toString?.() ?? ''
      if (!origin && !target) continue
      // Indexar por persona origen
      if (origin) {
        if (!relationshipsByPerson.has(origin)) relationshipsByPerson.set(origin, [])
        relationshipsByPerson.get(origin)!.push(rel)
      }
      // Indexar por persona destino (relación inversa: alguien declaró relación con esta persona)
      if (target && target !== origin) {
        const inverseRel = {
          ...rel,
          _inverse: true,
          // Para inversa: la persona "origen" pasa a ser la que declaró (rel.person)
          _declaredByPersonId: origin,
          // La persona que originalmente es "relatedPerson" es la que estamos indexando
          _relatedPersonId: rel.relatedPerson?._id?.toString?.() ?? rel.relatedPerson?.toString?.() ?? '',
        }
        if (!relationshipsByPerson.has(target)) relationshipsByPerson.set(target, [])
        relationshipsByPerson.get(target)!.push(inverseRel)
      }
    }
  }

  const items = persons.map((p) => {
    const pid = p._id?.toString?.() ?? ''
    const result: Record<string, any> = {
      id: pid,
      name: p.name,
      birthDate: p.birthDate,
      age: p.birthDate ? getAge(p.birthDate) : null,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      address: p.address,
      maritalStatus: p.maritalStatus,
      membershipDate: p.membershipDate,
      baptismDate: p.baptismDate,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }

    // Membresías activas de la persona (desde el mapa global)
    result.ministries = (membershipsByPerson.get(pid) || []).map((m: any) => ({
      id: m.ministry?._id?.toString?.() ?? '',
      name: m.ministry?.name ?? '',
      code: m.ministry?.code ?? '',
      color: m.ministry?.color ?? '',
      icon: m.ministry?.icon ?? '',
      roleInMinistry: m.roleInMinistry,
    }))

    // Niños relacionados (para check-in de RocaKids)
    if (includeRelatedKids) {
      const relatedKids: Record<string, any>[] = []
      const seenKids = new Set<string>()

      // 1) Desde las familias del hogar: miembros con rol hijo/hija
      const personFamilies = familiesByPerson.get(pid) || []
      for (const fam of personFamilies) {
        for (const member of fam.members ?? []) {
          const child = member.person
          if (!child?._id) continue
          const childIdStr = child._id.toString()
          if (childIdStr === pid) continue
          const kidRole = member.roleInFamily ?? ''
          const isKidLike = /hijo|hija|niño|niña|sobrino|sobrina|nieto|nieta|bebé|bebe/i.test(kidRole)
          if (!isKidLike) continue
          const childAge = child.birthDate ? getAge(child.birthDate) : null
          if (kidAgeRange && (childAge === null || childAge < kidAgeRange.min || childAge > kidAgeRange.max)) {
            continue
          }
          if (seenKids.has(childIdStr)) continue
          seenKids.add(childIdStr)
          relatedKids.push({
            id: childIdStr,
            name: child.name ?? '',
            birthDate: child.birthDate ?? null,
            age: childAge,
            gender: child.gender ?? null,
            relationship: kidRole,
            source: 'family',
            eligible: childAge !== null && childAge >= (kidAgeRange?.min ?? -Infinity) && childAge <= (kidAgeRange?.max ?? Infinity),
          })
        }
      }

      // 2) Desde las relaciones directas (ambas direcciones)
      const personRelationships = relationshipsByPerson.get(pid) || []
      for (const rel of personRelationships) {
        // Determinar la "otra persona" y el tipo de relación
        let relPerson: any = null
        let relType = ''
        if (rel._inverse) {
          // Relación inversa: alguien (rel.person) declaró una relación con esta persona
          relPerson = rel.person
          relType = rel.relationshipType ?? ''
        } else {
          // Relación directa: esta persona declaró relación con rel.relatedPerson
          relPerson = rel.relatedPerson
          relType = rel.relationshipType ?? ''
        }
        if (!relPerson?._id) continue
        const relIdStr = relPerson._id.toString()
        if (relIdStr === pid) continue
        const kidLike = /hijo|hija|sobrino|sobrina|nieto|nieta/i.test(relType)
        if (!kidLike) continue
        if (seenKids.has(relIdStr)) continue
        seenKids.add(relIdStr)
        const relAge = relPerson.birthDate ? getAge(relPerson.birthDate) : null
        if (kidAgeRange && (relAge === null || relAge < kidAgeRange.min || relAge > kidAgeRange.max)) {
          continue
        }
        relatedKids.push({
          id: relIdStr,
          name: relPerson.name ?? '',
          birthDate: relPerson.birthDate ?? null,
          age: relAge,
          gender: relPerson.gender ?? null,
          relationship: relType,
          source: 'relationship',
          eligible: relAge !== null && relAge >= (kidAgeRange?.min ?? -Infinity) && relAge <= (kidAgeRange?.max ?? Infinity),
        })
      }

      result.relatedKids = relatedKids
    }

    return result
  })

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})