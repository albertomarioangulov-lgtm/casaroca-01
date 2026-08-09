import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { EventAssignment } from '~~/server/models/EventAssignment'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createAssignmentSchema = z.object({
  assignmentType: z.enum(['reception', 'child_care', 'teaching', 'logistics', 'group_leader', 'other']),
  ministryRoleId: z.string().optional(),
  roleName: z.string().optional(),
  description: z.string().optional(),
  minAge: z.number().int().min(0).nullable().optional(),
  maxAge: z.number().int().min(0).nullable().optional(),
  assignedPersons: z.array(z.string()).optional(), // Person IDs
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ASSIGNMENTS_CREATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de evento requerido' })
  }

  const eventDoc = await Event.findById(id)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const body = await readBody(event)
  const result = createAssignmentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de asignación fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { assignmentType, ministryRoleId, roleName, description, minAge, maxAge, assignedPersons } = result.data

  // Validar personas asignadas
  const personIds: string[] = []
  for (const pid of assignedPersons ?? []) {
    const person = await Person.findById(pid)
    if (!person) {
      throw createError({ statusCode: 400, statusMessage: `La persona ${pid} no existe` })
    }
    personIds.push(person._id.toString())
  }

  const assignment = await EventAssignment.create({
    event: eventDoc._id,
    assignmentType,
    ministryRole: ministryRoleId || undefined,
    roleName,
    description,
    minAge: minAge ?? undefined,
    maxAge: maxAge ?? undefined,
    assignedPersons: personIds,
  })

  return {
    id: assignment._id.toString(),
    eventId: eventDoc._id.toString(),
    assignmentType: assignment.assignmentType,
    ministryRoleId: assignment.ministryRole?.toString?.() ?? null,
    roleName: assignment.roleName,
    description: assignment.description,
    minAge: assignment.minAge,
    maxAge: assignment.maxAge,
    assignedPersons: personIds,
    createdAt: assignment.createdAt,
  }
})