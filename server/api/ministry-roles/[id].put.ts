import { z } from 'zod'
import { MinistryRole } from '~~/server/models/MinistryRole'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateMinistryRoleSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MINISTRY_ROLES_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de función requerido' })
  }

  const body = await readBody(event)
  const result = updateMinistryRoleSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de función fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  if ('description' in updateData && !updateData.description) {
    updateData.description = undefined
  }

  const role = await MinistryRole.findByIdAndUpdate(id, updateData, { new: true })
    .populate('ministry', 'name')
    .lean()

  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Función no encontrada' })
  }

  return {
    id: role._id.toString(),
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    ministryId: (role.ministry as any)?._id?.toString?.() ?? '',
    ministryName: (role.ministry as any)?.name ?? '',
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }
})