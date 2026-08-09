import { z } from 'zod'
import { MinistryRole } from '~~/server/models/MinistryRole'
import { Ministry } from '~~/server/models/Ministry'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const createMinistryRoleSchema = z.object({
  ministryId: z.string().min(1, 'El ministerio es requerido'),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRY_ROLES_CREATE)

  const body = await readBody(event)
  const result = createMinistryRoleSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de función fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { ministryId, name, description, isActive } = result.data

  // Validar que el ministerio exista
  const ministry = await Ministry.findById(ministryId)
  if (!ministry) {
    throw createError({ statusCode: 400, statusMessage: 'El ministerio no existe' })
  }

  const roleDoc = await MinistryRole.create({
    ministry: ministry._id,
    name,
    description,
    isActive: isActive ?? true,
  })

  return {
    id: roleDoc._id.toString(),
    name: roleDoc.name,
    description: roleDoc.description,
    isActive: roleDoc.isActive,
    ministryId: ministry._id.toString(),
    ministryName: ministry.name,
    createdAt: roleDoc.createdAt,
  }
})