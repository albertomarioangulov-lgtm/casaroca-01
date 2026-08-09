import { Caregiver } from '~~/server/models/Caregiver'
import { Child } from '~~/server/models/Child'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de acudiente requerido' })
  }

  const caregiver = await Caregiver.findByIdAndDelete(id)

  if (!caregiver) {
    throw createError({ statusCode: 404, statusMessage: 'Acudiente no encontrado' })
  }

  // Quitar el acudiente de los niños asociados
  await Child.updateMany(
    { 'caregivers.caregiver': id },
    { $pull: { caregivers: { caregiver: id } } }
  )

  // Eliminar los check-ins del acudiente
  await EventCheckIn.deleteMany({ caregiverId: id })

  return { success: true }
})