import { z } from 'zod'
import { MinistryMembership } from '~~/server/models/MinistryMembership'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateMembershipSchema = z.object({
  roleInMinistry: z.enum(['member', 'leader', 'director']).optional(),
  specialties: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MEMBERSHIPS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de membresía requerido' })
  }

  const body = await readBody(event)
  const result = updateMembershipSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de membresía fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const membership = await MinistryMembership.findByIdAndUpdate(id, result.data, { new: true })
    .populate('person', 'name phone')
    .populate('ministry', 'name code color icon')
    .lean()

  if (!membership) {
    throw createError({ statusCode: 404, statusMessage: 'Membresía no encontrada' })
  }

  return {
    id: membership._id.toString(),
    personId: (membership.person as any)?._id?.toString?.() ?? (membership.person as any)?.toString?.() ?? '',
    personName: (membership.person as any)?.name ?? '',
    ministryId: (membership.ministry as any)?._id?.toString?.() ?? (membership.ministry as any)?.toString?.() ?? '',
    ministryName: (membership.ministry as any)?.name ?? '',
    roleInMinistry: membership.roleInMinistry,
    source: membership.source,
    joinedAt: membership.joinedAt,
    status: membership.status,
    specialties: (membership.specialties ?? []).map((s: any) => s.toString()),
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  }
})