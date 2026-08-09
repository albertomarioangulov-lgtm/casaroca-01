import { z } from 'zod'
import { Child } from '~~/server/models/Child'
import { Caregiver } from '~~/server/models/Caregiver'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const addCaregiverSchema = z.object({
  caregiverId: z.string().optional(), // Si viene, es un acudiente existente
  name: z.string().trim().min(1).optional(), // Si es nuevo
  phone: z.string().optional(),
  relationship: z.string().trim().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHILDREN_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de niño requerido' })
  }

  const body = await readBody(event)
  const result = addCaregiverSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { caregiverId, name, phone, relationship } = result.data

  const child = await Child.findById(id)
  if (!child) {
    throw createError({ statusCode: 404, statusMessage: 'Niño no encontrado' })
  }

  // 1. Resolver el acudiente: existente o nuevo
  let resolvedCaregiverId: string
  if (caregiverId) {
    const existing = await Caregiver.findById(caregiverId)
    if (!existing) {
      throw createError({ statusCode: 400, statusMessage: 'El acudiente seleccionado no existe' })
    }
    resolvedCaregiverId = existing._id.toString()
  } else {
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'El nombre del acudiente es requerido' })
    }
    const newCaregiver = await Caregiver.create({
      name,
      phone: phone || '',
    })
    resolvedCaregiverId = newCaregiver._id.toString()
  }

  // 2. Agregar/actualizar la relación al niño (acumulativo: no borra los existentes)
  const childAny = child as any
  const existingCaregivers = childAny.caregivers ?? []

  const existingIndex = existingCaregivers.findIndex(
    (cg: any) => cg.caregiver?.toString?.() === resolvedCaregiverId
  )

  if (existingIndex >= 0) {
    // Ya está asociado: actualizar la relación si viene
    if (relationship) {
      existingCaregivers[existingIndex].relationship = relationship
    }
  } else {
    existingCaregivers.push({
      caregiver: resolvedCaregiverId,
      relationship: relationship || '',
    })
  }

  await child.save()

  // Retornar la lista actualizada de acudientes con sus datos
  const updatedChild = await Child.findById(id)
    .populate('caregivers.caregiver', 'name phone')
    .lean()

  return {
    success: true,
    caregivers: (updatedChild?.caregivers ?? []).map((cg: any) => ({
      id: cg.caregiver?._id?.toString?.() ?? cg.caregiver?.toString?.() ?? '',
      name: cg.caregiver?.name ?? '',
      phone: cg.caregiver?.phone ?? '',
      relationship: cg.relationship,
    })),
  }
})