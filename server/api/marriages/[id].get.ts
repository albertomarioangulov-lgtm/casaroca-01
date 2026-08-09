import { Marriage } from '~~/server/models/Marriage'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.MARRIAGES_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de matrimonio requerido' })
  }

  const marriage = await Marriage.findById(id)
    .populate('spouse1', 'name phone email birthDate gender maritalStatus')
    .populate('spouse2', 'name phone email birthDate gender maritalStatus')
    .lean()

  if (!marriage) {
    throw createError({ statusCode: 404, statusMessage: 'Matrimonio no encontrado' })
  }

  return {
    id: marriage._id.toString(),
    spouse1: {
      id: (marriage.spouse1 as any)?._id?.toString?.() ?? (marriage.spouse1 as any)?.toString?.() ?? '',
      name: (marriage.spouse1 as any)?.name ?? '',
      phone: (marriage.spouse1 as any)?.phone ?? '',
      email: (marriage.spouse1 as any)?.email ?? '',
      birthDate: (marriage.spouse1 as any)?.birthDate ?? null,
      gender: (marriage.spouse1 as any)?.gender ?? null,
    },
    spouse2: {
      id: (marriage.spouse2 as any)?._id?.toString?.() ?? (marriage.spouse2 as any)?.toString?.() ?? '',
      name: (marriage.spouse2 as any)?.name ?? '',
      phone: (marriage.spouse2 as any)?.phone ?? '',
      email: (marriage.spouse2 as any)?.email ?? '',
      birthDate: (marriage.spouse2 as any)?.birthDate ?? null,
      gender: (marriage.spouse2 as any)?.gender ?? null,
    },
    marriageDate: marriage.marriageDate,
    status: marriage.status,
    createdAt: marriage.createdAt,
    updatedAt: marriage.updatedAt,
  }
})