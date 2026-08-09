import { Caregiver } from '~~/server/models/Caregiver'
import { Child } from '~~/server/models/Child'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CAREGIVERS_READ)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de acudiente requerido' })
  }

  const caregiver = await Caregiver.findById(id).lean()

  if (!caregiver) {
    throw createError({ statusCode: 404, statusMessage: 'Acudiente no encontrado' })
  }

  // Buscar todos los niños asociados a este acudiente
  const children = await Child.find({ 'caregivers.caregiver': id })
    .select('name birthDate caregivers')
    .lean()

  // Para cada niño, armar la lista de los otros acudientes (red familiar)
  const childrenWithNetwork = children.map((child: any) => {
    const caregiverEntries = (child.caregivers ?? []) as any[]

    const relationshipToCaregiver = caregiverEntries.find(
      (cg: any) => cg.caregiver?.toString?.() === id
    )?.relationship ?? ''

    // IDs de los otros acudientes
    const otherCaregiverIds = caregiverEntries
      .filter((cg: any) => cg.caregiver?.toString?.() !== id)
      .map((cg: any) => cg.caregiver?.toString?.())

    return {
      id: child._id.toString(),
      name: child.name,
      birthDate: child.birthDate,
      relationshipToCaregiver,
      otherCaregiverIds,
    }
  })

  // Hacer una sola consulta para todos los otros acudientes
  const allOtherIds = Array.from(new Set(childrenWithNetwork.flatMap((c) => c.otherCaregiverIds)))
  const otherCaregivers = await Caregiver.find({ _id: { $in: allOtherIds } })
    .select('name phone')
    .lean()

  const caregiverMap = new Map<string, any>(
    otherCaregivers.map((cg: any) => [cg._id.toString(), cg])
  )

  // Armar cada niño con su red familiar completa
  const childrenWithFullNetwork = childrenWithNetwork.map((childNetwork: any) => {
    const otherCaregiversList = childNetwork.otherCaregiverIds
      .map((cgId: string) => {
        const cg = caregiverMap.get(cgId)
        if (!cg) return null
        // Buscar la relación de este acudiente con el niño
        const child = children.find((c: any) => c._id.toString() === childNetwork.id)
        const rel = (child?.caregivers ?? []).find(
          (entry: any) => entry.caregiver?.toString?.() === cgId
        )?.relationship ?? ''
        return {
          id: cg._id.toString(),
          name: cg.name,
          phone: cg.phone,
          relationship: rel,
        }
      })
      .filter(Boolean)

    return {
      id: childNetwork.id,
      name: childNetwork.name,
      birthDate: childNetwork.birthDate,
      relationshipToCaregiver: childNetwork.relationshipToCaregiver,
      otherCaregivers: otherCaregiversList,
    }
  })

  return {
    id: caregiver._id.toString(),
    name: caregiver.name,
    phone: caregiver.phone,
    createdAt: caregiver.createdAt,
    updatedAt: caregiver.updatedAt,
    children: childrenWithFullNetwork,
  }
})