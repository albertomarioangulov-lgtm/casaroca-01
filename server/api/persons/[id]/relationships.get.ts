import { Person } from '~~/server/models/Person'
import { Relationship } from '~~/server/models/Relationship'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

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
  await requirePermission(event, PERMISSIONS.RELATIONSHIPS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const person = await Person.findById(id).lean()
  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }

  const personGender: 'male' | 'female' = person.gender ?? 'male'

  // Relaciones donde la persona es el origen: "person es (type) de related"
  const outbound = await Relationship.find({ person: person._id })
    .populate('relatedPerson', 'name phone birthDate gender')
    .lean()

  // Relaciones donde la persona es el destino: "alguien es (type) de person"
  const inbound = await Relationship.find({ relatedPerson: person._id })
    .populate('person', 'name phone birthDate gender')
    .lean()

  // Salientes: la persona vista → la otra persona (rol directo)
  const outboundItems = outbound.map((r: any) => ({
    id: r._id.toString(),
    relationshipId: r._id.toString(),
    personId: person._id.toString(),
    relatedPersonId: r.relatedPerson?._id?.toString?.() ?? r.relatedPerson?.toString?.() ?? '',
    relatedPersonName: r.relatedPerson?.name ?? '',
    relatedPersonPhone: r.relatedPerson?.phone ?? '',
    relatedPersonBirthDate: r.relatedPerson?.birthDate ?? null,
    relatedPersonGender: r.relatedPerson?.gender ?? null,
    relationshipType: r.relationshipType,
    perspective: 'outbound', // la persona vista "es" este tipo de la relacionada
  }))

  // Entrantes: la otra persona → la persona vista (rol inverso derivado para la vista)
  const inboundItems = inbound.map((r: any) => {
    const type = r.relationshipType
    const inverse = INVERSE_MAP[type]?.[personGender] ?? 'otro'
    return {
      id: r._id.toString(),
      relationshipId: r._id.toString(),
      personId: r.person?._id?.toString?.() ?? r.person?.toString?.() ?? '',
      personName: r.person?.name ?? '',
      personPhone: r.person?.phone ?? '',
      personBirthDate: r.person?.birthDate ?? null,
      personGender: r.person?.gender ?? null,
      relationshipType: inverse,
      perspective: 'inbound', // la persona relacionada "es" este tipo de la persona vista
    }
  })

  return {
    outbound: outboundItems,
    inbound: inboundItems,
    total: outboundItems.length + inboundItems.length,
  }
})