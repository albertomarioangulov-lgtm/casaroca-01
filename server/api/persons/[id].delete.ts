import { Person } from '~~/server/models/Person'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { Invitation } from '~~/server/models/Invitation'
import { Family } from '~~/server/models/Family'
import { Marriage } from '~~/server/models/Marriage'
import { EventAssignment } from '~~/server/models/EventAssignment'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { CourseEnrollment } from '~~/server/models/CourseEnrollment'
import { CourseAttendance } from '~~/server/models/CourseAttendance'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.PERSONS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de persona requerido' })
  }

  const person = await Person.findById(id)
  if (!person) {
    throw createError({ statusCode: 404, statusMessage: 'Persona no encontrada' })
  }

  // Eliminar referencias dependientes
  await MinistryMembership.deleteMany({ person: person._id })
  await Invitation.deleteMany({ person: person._id })
  await EventEnrollment.deleteMany({ person: person._id })
  await CourseEnrollment.deleteMany({ person: person._id })
  await CourseAttendance.deleteMany({ person: person._id })

  // Quitar la persona de las familias
  await Family.updateMany(
    {},
    { $pull: { members: { person: person._id } } }
  )

  // Quitar la persona de las asignaciones de evento
  await EventAssignment.updateMany(
    {},
    { $pull: { assignedPersons: person._id } }
  )

  // Marcar matrimonios donde participa como inactivos
  await Marriage.updateMany(
    { $or: [{ spouse1: person._id }, { spouse2: person._id }], status: 'active' },
    { $set: { status: 'widowed' } }
  )

  await Person.findByIdAndDelete(person._id)

  return { success: true, id }
})