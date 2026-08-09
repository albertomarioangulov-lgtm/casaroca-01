import { Person } from '~~/server/models/Person'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Family } from '~~/server/models/Family'
import { Marriage } from '~~/server/models/Marriage'
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

// Mapa de relación inversa según el género de la persona que ve
const INVERSE_MAP: Record<string, { male: string; female: string }> = {
  padre: { male: 'hijo', female: 'hija' },
  madre: { male: 'hijo', female: 'hija' },
  hijo: { male: 'padre', female: 'madre' },
  hija: { male: 'padre', female: 'madre' },
  hermano: { male: 'hermano', female: 'hermana' },
  hermana: { male: 'hermano', female: 'hermana' },
  tio: { male: 'sobrino', female: 'sobrina' },
  tia: { male: 'sobrino', female: 'sobrina' },
  sobrino: { male: 'tio', female: 'tia' },
  sobrina: { male: 'tio', female: 'tia' },
  abuelo: { male: 'nieto', female: 'nieta' },
  abuela: { male: 'nieto', female: 'nieta' },
  nieto: { male: 'abuelo', female: 'abuela' },
  nieta: { male: 'abuelo', female: 'abuela' },
  primo: { male: 'primo', female: 'prima' },
  prima: { male: 'primo', female: 'prima' },
  cuñado: { male: 'cuñado', female: 'cuñada' },
  cuñada: { male: 'cuñado', female: 'cuñada' },
  suegro: { male: 'yerno', female: 'nuera' },
  suegra: { male: 'yerno', female: 'nuera' },
  yerno: { male: 'suegro', female: 'suegra' },
  nuera: { male: 'suegro', female: 'suegra' },
  otro: { male: 'otro', female: 'otro' },
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PERSONS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const person = await Person.findById(id).lean()
  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }

  const personGender: 'male' | 'female' = person.gender ?? 'male'

  // Membresías activas con ministerio poblado
  const memberships = await MinistryMembership.find({ person: person._id, status: 'active' })
    .populate('ministry', 'name code color icon')
    .populate('specialties', 'name')
    .lean()

  // Familias de la persona (con todos sus miembros poblados)
  const families = await Family.find({ 'members.person': person._id })
    .populate('members.person', 'name phone email birthDate gender')
    .lean()

  // Matrimonios activos de la persona
  const marriages = await Marriage.find({
    $or: [{ spouse1: person._id }, { spouse2: person._id }],
    status: 'active',
  })
    .populate('spouse1', 'name')
    .populate('spouse2', 'name')
    .lean()

  // Relaciones salientes: "person es (type) de related"
  const outbound = await Relationship.find({ person: person._id })
    .populate('relatedPerson', 'name phone birthDate gender')
    .lean()

  // Relaciones entrantes: "alguien es (type) de person" → rol inverso derivado
  const inbound = await Relationship.find({ relatedPerson: person._id })
    .populate('person', 'name phone birthDate gender')
    .lean()

  return {
    id: person._id.toString(),
    name: person.name,
    birthDate: person.birthDate,
    age: person.birthDate ? getAge(person.birthDate) : null,
    phone: person.phone,
    email: person.email,
    gender: person.gender,
    address: person.address,
    maritalStatus: person.maritalStatus,
    membershipDate: person.membershipDate,
    baptismDate: person.baptismDate,
    isActive: person.isActive,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    ministries: memberships.map((m: any) => ({
      id: m.ministry?._id?.toString?.() ?? '',
      name: m.ministry?.name ?? '',
      code: m.ministry?.code ?? '',
      color: m.ministry?.color ?? '',
      icon: m.ministry?.icon ?? '',
      roleInMinistry: m.roleInMinistry,
      source: m.source,
      joinedAt: m.joinedAt,
      status: m.status,
      specialties: (m.specialties ?? []).map((s: any) => ({
        id: s._id?.toString?.() ?? '',
        name: s.name ?? '',
      })),
    })),
    families: families.map((f: any) => {
      const myRole = (f.members ?? []).find(
        (m: any) => m.person?._id?.toString?.() === person._id.toString()
      )?.roleInFamily ?? null
      return {
        id: f._id.toString(),
        name: f.name,
        roleInFamily: myRole,
        members: (f.members ?? []).map((m: any) => ({
          personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
          name: m.person?.name ?? '',
          phone: m.person?.phone ?? '',
          email: m.person?.email ?? '',
          birthDate: m.person?.birthDate ?? null,
          gender: m.person?.gender ?? null,
          roleInFamily: m.roleInFamily ?? '',
        })),
      }
    }),
    marriages: marriages.map((m: any) => {
      const spousePersonId = person._id.toString()
      const spouse = m.spouse1?._id?.toString?.() === spousePersonId ? m.spouse2 : m.spouse1
      return {
        id: m._id.toString(),
        spouseId: spouse?._id?.toString?.() ?? '',
        spouseName: spouse?.name ?? '',
        marriageDate: m.marriageDate,
        status: m.status,
      }
    }),
    relationships: {
      outbound: outbound.map((r: any) => ({
        id: r._id.toString(),
        personId: person._id.toString(),
        relatedPersonId: r.relatedPerson?._id?.toString?.() ?? r.relatedPerson?.toString?.() ?? '',
        relatedPersonName: r.relatedPerson?.name ?? '',
        relatedPersonPhone: r.relatedPerson?.phone ?? '',
        relatedPersonBirthDate: r.relatedPerson?.birthDate ?? null,
        relatedPersonGender: r.relatedPerson?.gender ?? null,
        relationshipType: r.relationshipType,
        perspective: 'outbound',
      })),
      inbound: inbound.map((r: any) => {
        const type = r.relationshipType
        const inverse = INVERSE_MAP[type]?.[personGender] ?? 'otro'
        return {
          id: r._id.toString(),
          personId: r.person?._id?.toString?.() ?? r.person?.toString?.() ?? '',
          personName: r.person?.name ?? '',
          personPhone: r.person?.phone ?? '',
          personBirthDate: r.person?.birthDate ?? null,
          personGender: r.person?.gender ?? null,
          relationshipType: inverse,
          perspective: 'inbound',
        }
      }),
    },
  }
})