import { Family } from '~~/server/models/Family'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.FAMILIES_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de familia requerido' })
  }

  const family = await Family.findById(id)
    .populate('members.person', 'name phone email birthDate gender')
    .lean()

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Familia no encontrada' })
  }

  return {
    id: family._id.toString(),
    name: family.name,
    members: (family.members ?? []).map((m: any) => ({
      personId: m.person?._id?.toString?.() ?? m.person?.toString?.() ?? '',
      name: m.person?.name ?? '',
      phone: m.person?.phone ?? '',
      email: m.person?.email ?? '',
      birthDate: m.person?.birthDate ?? null,
      gender: m.person?.gender ?? null,
      roleInFamily: m.roleInFamily,
    })),
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  }
})