import { z } from 'zod'
import { Person } from '~~/server/models/Person'
import { Relationship } from '~~/server/models/Relationship'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createRelationshipSchema = z.object({
  relatedPersonId: z.string().min(1, 'La persona relacionada es requerida'),
  relationshipType: z.enum([
    'padre', 'madre', 'hijo', 'hija',
    'hermano', 'hermana', 'tio', 'tia',
    'sobrino', 'sobrina', 'abuelo', 'abuela',
    'nieto', 'nieta', 'primo', 'prima',
    'cuñado', 'cuñada', 'suegro', 'suegra',
    'yerno', 'nuera', 'otro',
  ]),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.RELATIONSHIPS_CREATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const body = await readBody(event)
  const result = createRelationshipSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de relación fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { relatedPersonId, relationshipType } = result.data

  if (id === relatedPersonId) {
    throw createError({ statusCode: 400, statusMessage: 'Una persona no puede relacionarse consigo misma' })
  }

  const [person, relatedPerson] = await Promise.all([
    Person.findById(id),
    Person.findById(relatedPersonId),
  ])
  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }
  if (!relatedPerson) {
    throw createError({ statusCode: 400, statusMessage: 'La persona relacionada no existe' })
  }

  // Evitar duplicados de la misma relación
  const existing = await Relationship.findOne({
    person: person._id,
    relatedPerson: relatedPerson._id,
    relationshipType,
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Esta relación ya existe' })
  }

  const relationship = await Relationship.create({
    person: person._id,
    relatedPerson: relatedPerson._id,
    relationshipType,
  })

  return {
    id: relationship._id.toString(),
    personId: relationship.person.toString(),
    relatedPersonId: relationship.relatedPerson.toString(),
    relationshipType: relationship.relationshipType,
    createdAt: relationship.createdAt,
  }
})