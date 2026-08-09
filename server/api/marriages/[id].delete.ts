import { Marriage } from '~~/server/models/Marriage'
import { Person } from '~~/server/models/Person'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MARRIAGES_DELETE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de matrimonio requerido' })
  }

  const marriage = await Marriage.findById(id)
  if (!marriage) {
    throw createError({ statusCode: 404, statusMessage: 'Matrimonio no encontrado' })
  }

  // Si el matrimonio era activo, actualizar estado civil de ambos a soltero
  if (marriage.status === 'active') {
    await Person.updateOne({ _id: marriage.spouse1 }, { $set: { maritalStatus: 'single' } })
    await Person.updateOne({ _id: marriage.spouse2 }, { $set: { maritalStatus: 'single' } })
  }

  await Marriage.findByIdAndDelete(marriage._id)

  return { success: true, id }
})