import { Person } from '~~/server/models/Person'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Family } from '~~/server/models/Family'
import { Relationship } from '~~/server/models/Relationship'
import { Ministry } from '~~/server/models/Ministry'
import { Event } from '~~/server/models/Event'
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
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
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

  const items = await Promise.all(persons.map(async (p) => {
    const result: Record<string, any> = {
      id: p._id?.toString?.() ?? '',
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

    // Membresías activas de la persona
    const memberships = await MinistryMembership.find({
      person: p._id,
      status: 'active',
    })
      .populate('ministry', 'name code color icon')
      .lean()

    result.ministries = memberships.map((m: any) => ({
      id: m.ministry?._id?.toString?.() ?? '',
      name: m.ministry?.name ?? '',
      code: m.ministry?.code ?? '',
      color: m.ministry?.color ?? '',
      icon: m.ministry?.icon ?? '',
      roleInMinistry: m.roleInMinistry,
    }))

    // Niños relacionados (para check-in de RocaKids):
    // 1) miembros del hogar con rol hijo/hija en familias de la persona
    if (includeRelatedKids) {
      const relatedKids: Record<string, any>[] = []

      // Desde la familia del hogar: tomar los miembros con rol hijo/hija
      const families = await Family.find({ 'members.person': p._id })
        .populate('members.person', 'name birthDate gender')
        .lean()
      for (const fam of families as any[]) {
        for (const member of fam.members ?? []) {
          const child = member.person
          if (!child?._id) continue
          const childIdStr = child._id.toString()
          if (childIdStr === p._id.toString()) continue
          const kidRole = member.roleInFamily ?? ''
          const isKidLike = /hijo|hija|niño|niña|sobrino|sobrina|nieto|nieta|bebé|bebe/i.test(kidRole)
          if (!isKidLike) continue
          const childAge = child.birthDate ? getAge(child.birthDate) : null
          // Filtrar por rango de edad (configurado en el ministerio del evento)
          if (kidAgeRange && (childAge === null || childAge < kidAgeRange.min || childAge > kidAgeRange.max)) {
            continue
          }
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

      // Desde las relaciones: personas que la persona trae como hijo/hija/tío/abuelo etc.
      const outbound = await Relationship.find({ person: p._id })
        .populate('relatedPerson', 'name birthDate gender')
        .lean()
      for (const rel of outbound as any[]) {
        const relPerson = rel.relatedPerson
        if (!relPerson?._id) continue
        const relIdStr = relPerson._id.toString()
        if (relIdStr === p._id.toString()) continue
        const kidLike = /hijo|hija|sobrino|sobrina|nieto|nieta/i.test(rel.relationshipType ?? '')
        if (!kidLike) continue
        // Evitar duplicados con el hogar
        if (relatedKids.some((k) => k.id === relIdStr)) continue
        const relAge = relPerson.birthDate ? getAge(relPerson.birthDate) : null
        // Filtrar por rango de edad (configurado en el ministerio del evento)
        if (kidAgeRange && (relAge === null || relAge < kidAgeRange.min || relAge > kidAgeRange.max)) {
          continue
        }
        relatedKids.push({
          id: relIdStr,
          name: relPerson.name ?? '',
          birthDate: relPerson.birthDate ?? null,
          age: relAge,
          gender: relPerson.gender ?? null,
          relationship: rel.relationshipType ?? '',
          source: 'relationship',
          eligible: relAge !== null && relAge >= (kidAgeRange?.min ?? -Infinity) && relAge <= (kidAgeRange?.max ?? Infinity),
        })
      }

      result.relatedKids = relatedKids
    }

    return result
  }))

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})