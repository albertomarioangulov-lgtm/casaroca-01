import { z } from 'zod'
import { Types } from 'mongoose'
import { Event } from '~~/server/models/Event'
import { Ministry } from '~~/server/models/Ministry'
import { Person } from '~~/server/models/Person'
import { Family } from '~~/server/models/Family'
import { Relationship } from '~~/server/models/Relationship'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const childEntrySchema = z.object({
  personId: z.string().optional(), // Si viene, es un niño existente
  name: z.string().trim().min(1).optional(), // Si es nuevo
  birthDate: z.string().optional(),
  wristbandNumber: z.string().trim().min(1, 'El número de manilla es requerido'),
})

const createCheckInSchema = z.object({
  eventId: z.string().min(1, 'El evento es requerido'),
  caregiver: z.object({
    personId: z.string().optional(), // Si viene, es un acudiente existente
    name: z.string().trim().min(1).optional(), // Si es nuevo
    phone: z.string().optional(),
  }),
  children: z.array(childEntrySchema).min(1, 'Debe registrar al menos un niño'),
  allowedPickups: z.array(z.string()).optional(), // Person IDs autorizados a recoger
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.CHECKINS_CREATE)

  const body = await readBody(event)
  const result = createCheckInSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de check-in fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { eventId, caregiver: caregiverInput, children, allowedPickups } = result.data

  // 1. Validar que el evento exista
  const eventDoc = await Event.findById(eventId)
  if (!eventDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // 1b. Validar estado del evento: solo eventos activos permiten registrar asistencia
  if (eventDoc.status !== 'active') {
    const statusMessages: Record<string, string> = {
      scheduled: 'El evento está programado. Debes activarlo antes de registrar asistencia.',
      finished: 'El evento ya finalizó. No se puede registrar asistencia.',
      cancelled: 'El evento está cancelado. No se puede registrar asistencia.',
    }
    throw createError({
      statusCode: 400,
      statusMessage: statusMessages[eventDoc.status] || `El evento está en estado "${eventDoc.status}". Actívalo antes de registrar asistencia.`,
    })
  }

  // Rango de edad del ministerio del evento (si usa eligibilityType 'age')
  let eventMinAge: number | null = null
  let eventMaxAge: number | null = null
  if (eventDoc.ministry) {
    const ministry = await Ministry.findById(eventDoc.ministry).lean()
    if (ministry?.eligibilityType === 'age' && typeof ministry.minAge === 'number' && typeof ministry.maxAge === 'number') {
      eventMinAge = ministry.minAge
      eventMaxAge = ministry.maxAge
    }
  }

  const childAge = (birthDate?: Date | null): number | null => {
    if (!birthDate) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  // 2. Obtener o crear el acudiente como Person
  let caregiverId: string
  if (caregiverInput.personId) {
    const existing = await Person.findById(caregiverInput.personId)
    if (!existing) {
      throw createError({ statusCode: 400, statusMessage: 'El acudiente seleccionado no existe' })
    }
    caregiverId = existing._id.toString()
  } else {
    if (!caregiverInput.name) {
      throw createError({ statusCode: 400, statusMessage: 'El nombre del acudiente es requerido' })
    }
    const newCaregiver = await Person.create({
      name: caregiverInput.name,
      phone: caregiverInput.phone || undefined,
    })
    caregiverId = newCaregiver._id.toString()
  }

  // 3. Validar que las manillas no se repitan entre sí
  const wristbands = children.map((c) => c.wristbandNumber.trim())
  const uniqueWristbands = new Set(wristbands)
  if (uniqueWristbands.size !== wristbands.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Los números de manilla no pueden repetirse en el mismo ingreso',
    })
  }

  // 4. Validar que las manillas no estén ya usadas en el evento
  const usedWristbands = await EventCheckIn.find({
    event: eventDoc._id,
    wristbandNumber: { $in: wristbands },
  }).select('wristbandNumber').lean()
  if (usedWristbands.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `El número de manilla ${usedWristbands[0]?.wristbandNumber ?? ''} ya está registrado en este evento`,
    })
  }

  // 5. Procesar cada niño: obtener o crear como Person, crear check-in
  const createdCheckIns = []
  for (const childEntry of children) {
    let childId: string

    if (childEntry.personId) {
      const existingChild = await Person.findById(childEntry.personId)
      if (!existingChild) {
        throw createError({ statusCode: 400, statusMessage: `El niño ${childEntry.name || childEntry.personId} no existe` })
      }
      childId = existingChild._id.toString()

      // Verificar que el niño no esté ya registrado en este evento
      const alreadyCheckedIn = await EventCheckIn.findOne({ event: eventDoc._id, person: childId })
      if (alreadyCheckedIn) {
        throw createError({
          statusCode: 409,
          statusMessage: `El niño ${existingChild.name} ya está registrado en este evento`,
        })
      }
    } else {
      if (!childEntry.name) {
        throw createError({ statusCode: 400, statusMessage: 'El nombre del niño es requerido' })
      }

      const newChild = await Person.create({
        name: childEntry.name,
        birthDate: childEntry.birthDate ? new Date(childEntry.birthDate) : undefined,
      })
      childId = newChild._id.toString()
    }

    // Validar rango de edad (si el ministerio del evento lo define)
    if (eventMinAge !== null && eventMaxAge !== null) {
      const childDoc = await Person.findById(childId).select('name birthDate').lean()
      const age = childDoc?.birthDate ? childAge(childDoc.birthDate) : null
      if (age === null || age < eventMinAge || age > eventMaxAge) {
        const displayAge = age === null ? 'desconocida' : `${age} años`
        throw createError({
          statusCode: 400,
          statusMessage: `El niño ${childDoc?.name || ''} tiene ${displayAge} y el ministerio acepta de ${eventMinAge} a ${eventMaxAge} años`,
        })
      }
    }

    // Buscar pre-inscripción activa del niño al evento
    const enrollment = await EventEnrollment.findOne({
      event: eventDoc._id,
      person: childId,
      status: 'registered',
    }).lean()

    // Calcular familiares autorizados del niño (padres, abuelos, tíos, etc.)
    // Esto permite que un tío/abuela/hermano que trajo al niño quede autorizado a recogerlo
    let familyPickups: string[] = []
    if (allowedPickups && allowedPickups.length > 0) {
      familyPickups = [...allowedPickups]
    } else {
      const relationships = await Relationship.find({
        $or: [
          { person: childId },
          { relatedPerson: childId },
        ],
      }).lean()

      // Los familiares son las "otras personas" de cada relación
      const relatedIds = new Set<string>()
      for (const rel of relationships) {
        const origin = rel.person.toString()
        const target = rel.relatedPerson.toString()
        if (origin === childId) {
          relatedIds.add(target)
        } else {
          relatedIds.add(origin)
        }
      }
      familyPickups = Array.from(relatedIds)
    }

    // 6. Crear el check-in con pulsera
    const checkIn = await EventCheckIn.create({
      event: eventDoc._id,
      person: childId,
      checkInMethod: 'wristband',
      caregiver: caregiverId,
      wristbandNumber: childEntry.wristbandNumber.trim(),
      enrollment: enrollment?._id || undefined,
      checkInTime: new Date(),
      allowedPickups: familyPickups,
    })

    createdCheckIns.push({
      id: checkIn._id.toString(),
      personId: childId,
      wristbandNumber: checkIn.wristbandNumber,
      checkInTime: checkIn.checkInTime,
    })
  }

  // Asegurar que el acudiente y el niño queden en la misma familia
  for (const ci of createdCheckIns) {
    const childPerson = await Person.findById(ci.personId)
    if (!childPerson) continue
    const familyExists = await Family.findOne({
      'members.person': { $all: [caregiverId, ci.personId] },
    })
    if (!familyExists) {
      // Buscar familia del acudiente o crear una nueva
      let family = await Family.findOne({ 'members.person': caregiverId })
      if (!family) {
        family = await Family.create({
          name: `${childPerson.name} - ${(await Person.findById(caregiverId))?.name || ''}`,
          members: [{ person: caregiverId, roleInFamily: 'acudiente' }],
        })
      }
      const alreadyMember = (family.members ?? []).some(
        (m: any) => m.person?.toString?.() === ci.personId
      )
      if (!alreadyMember) {
        family.members.push({ person: ci.personId, roleInFamily: 'hijo' })
        await family.save()
      }
    }
  }

  return {
    success: true,
    caregiverId,
    checkIns: createdCheckIns,
  }
})