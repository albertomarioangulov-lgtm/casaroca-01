import { z } from 'zod'
import { Event } from '~~/server/models/Event'
import { Ministry } from '~~/server/models/Ministry'
import { Person } from '~~/server/models/Person'
import { Family } from '~~/server/models/Family'
import { Relationship } from '~~/server/models/Relationship'
import { EventCheckIn } from '~~/server/models/EventCheckIn'
import { EventEnrollment } from '~~/server/models/EventEnrollment'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { parseDateOnly } from '~~/server/utils/dates'

const childEntrySchema = z.object({
  personId: z.string().optional(), // Si viene, es un niño existente
  name: z.string().trim().min(1).optional(), // Si es nuevo
  birthDate: z.string().optional(),
  wristbandNumber: z.string().trim().min(1, 'El número de manilla es requerido'),
})

const personEntrySchema = z.object({
  personId: z.string().optional(), // Si viene, es una persona existente
  name: z.string().trim().min(1).optional(), // Si es nueva
  phone: z.string().optional(),
  wristbandNumber: z.string().trim().optional(), // Si el evento lo requiere
})

const createCheckInSchema = z.object({
  eventId: z.string().min(1, 'El evento es requerido'),
  // Flujo RocaKids (niños): un acudiente entrega a uno o más niños
  caregiver: z.object({
    personId: z.string().optional(), // Si viene, es un acudiente existente
    name: z.string().trim().min(1).optional(), // Si es nuevo
    phone: z.string().optional(),
  }).optional(),
  children: z.array(childEntrySchema).optional(),
  // Flujo eventos principales (adultos): personas que asisten directamente
  people: z.array(personEntrySchema).optional(),
  allowedPickups: z.array(z.string()).optional(), // Person IDs autorizados a recoger (solo RocaKids)
}).refine((data) => {
  const hasChildren = (data.children?.length ?? 0) > 0
  const hasPeople = (data.people?.length ?? 0) > 0
  return hasChildren || hasPeople
}, {
  message: 'Debe registrar al menos una persona',
  path: ['children', 'people'],
})

// ¿El evento pertenece al ministerio de niños (RocaKids/RokaKids)?
const isKidsEvent = (ministryName: string, ministryCode: string): boolean => {
  const name = (ministryName || '').toLowerCase()
  const code = (ministryCode || '').toLowerCase()
  return /roca\s*kids/.test(name) || /roca\s*kids/.test(code) || code === 'rokakids' || code === 'rocakids'
}

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

  const { eventId, caregiver: caregiverInput, children, people, allowedPickups } = result.data

  // 1. Validar que el evento exista
  const eventDoc = await Event.findById(eventId).populate('ministry', 'name code')
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

  // Detectar si es un evento de niños (RocaKids) o un evento principal (adultos)
  const ministry = (eventDoc as any).ministry as any
  const kidsEvent = isKidsEvent(ministry?.name ?? '', ministry?.code ?? '')
  const requireWristband = !!((eventDoc as any).requireWristband ?? false)

  // 2. Rango de edad del ministerio del evento (si usa eligibilityType 'age')
  let eventMinAge: number | null = null
  let eventMaxAge: number | null = null
  let ageGroups: Array<{ name?: string | null; minAge?: number | null; maxAge?: number | null }> = []
  if (eventDoc.ministry) {
    const ministryDoc = await Ministry.findById(eventDoc.ministry).lean()
    if (ministryDoc?.eligibilityType === 'age' && typeof ministryDoc.minAge === 'number' && typeof ministryDoc.maxAge === 'number') {
      eventMinAge = ministryDoc.minAge
      eventMaxAge = ministryDoc.maxAge
    }
    ageGroups = ministryDoc?.ageGroups ?? []
  }

  const childAge = (birthDate?: Date | null): number | null => {
    if (!birthDate) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  // Asignar el niño a un salón/grupo según su edad y los rangos configurados del ministerio
  const resolveAgeGroup = (age: number | null) => {
    if (age === null || ageGroups.length === 0) return { name: 'Sin grupo', index: -1, minAge: null, maxAge: null }
    const idx = ageGroups.findIndex((g) => age >= (g.minAge ?? 0) && age <= (g.maxAge ?? 999))
    if (idx === -1) return { name: 'Sin grupo', index: -1, minAge: null, maxAge: null }
    const group = ageGroups[idx]
    return { name: group?.name || 'Grupo', index: idx, minAge: group?.minAge ?? null, maxAge: group?.maxAge ?? null }
  }

  // ========================================================================
  // FLUJO A: RocaKids (niños) — un acudiente entrega a uno o más niños
  // ========================================================================
  if (kidsEvent) {
    if (!children?.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Debe registrar al menos un niño',
      })
    }
    if (!caregiverInput?.personId && !caregiverInput?.name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El acudiente que entrega es requerido',
      })
    }

    // Obtener o crear el acudiente como Person
    let caregiverId: string
    if (caregiverInput.personId) {
      const existing = await Person.findById(caregiverInput.personId)
      if (!existing) {
        throw createError({ statusCode: 400, statusMessage: 'El acudiente seleccionado no existe' })
      }
      caregiverId = existing._id.toString()
    } else {
      const newCaregiver = await Person.create({
        name: caregiverInput.name,
        phone: caregiverInput.phone || undefined,
      })
      caregiverId = newCaregiver._id.toString()
    }

    // Validar que las manillas no se repitan entre sí
    const wristbands = children.map((c) => c.wristbandNumber.trim())
    const uniqueWristbands = new Set(wristbands)
    if (uniqueWristbands.size !== wristbands.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Los números de manilla no pueden repetirse en el mismo ingreso',
      })
    }

    // Validar que las manillas no estén ya usadas en el evento
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

    // Procesar cada niño: obtener o crear como Person, crear check-in
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
          birthDate: parseDateOnly(childEntry.birthDate),
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
      // Siempre fusionar: 1) quien entregó (caregiver), 2) seleccionados por el recepcionista,
      // 3) familiares automáticos del niño desde Relationship
      const familyPickups = new Set<string>()
      familyPickups.add(caregiverId)
      for (const pid of allowedPickups ?? []) familyPickups.add(pid)

      const relationships = await Relationship.find({
        $or: [
          { person: childId },
          { relatedPerson: childId },
        ],
      }).lean()

      // Los familiares son las "otras personas" de cada relación
      for (const rel of relationships) {
        const origin = rel.person.toString()
        const target = rel.relatedPerson.toString()
        if (origin === childId) {
          familyPickups.add(target)
        } else {
          familyPickups.add(origin)
        }
      }

      // Calcular el salón/grupo del niño según su edad
      const childDoc = await Person.findById(childId).select('name birthDate').lean()
      const age = childDoc?.birthDate ? childAge(childDoc.birthDate) : null
      const ageGroup = resolveAgeGroup(age)

      // 6. Crear el check-in con pulsera; solo se guarda el índice del salón.
      // Los rangos viven en `event.ageGroupsSnapshot` del Evento (histórico congelado).
      const checkIn = await EventCheckIn.create({
        event: eventDoc._id,
        person: childId,
        checkInMethod: 'wristband',
        caregiver: caregiverId,
        wristbandNumber: childEntry.wristbandNumber.trim(),
        enrollment: enrollment?._id || undefined,
        checkInTime: new Date(),
        allowedPickups: Array.from(familyPickups),
        ageGroupIndex: ageGroup.index,
      })

      createdCheckIns.push({
        id: checkIn._id.toString(),
        personId: childId,
        name: childDoc?.name ?? '',
        wristbandNumber: checkIn.wristbandNumber,
        checkInTime: checkIn.checkInTime,
        age,
        ageGroupName: ageGroup.name,
        ageGroupIndex: ageGroup.index,
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
  }

  // ========================================================================
  // FLUJO B: Eventos principales (adultos) — personas que asisten directamente
  // Cada persona genera su propio check-in (uno por persona).
  // ========================================================================
  if (!people?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debe registrar al menos una persona',
    })
  }

  // Validar manillas: si el evento las requiere, todas deben tener número y no repetirse
  const wristbands = people.map((p) => p.wristbandNumber?.trim() || '')
  if (requireWristband) {
    if (wristbands.some((w) => !w)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Este evento requiere número de manilla para cada persona',
      })
    }
    const uniqueWristbands = new Set(wristbands)
    if (uniqueWristbands.size !== wristbands.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Los números de manilla no pueden repetirse en el mismo ingreso',
      })
    }

    // Validar que las manillas no estén ya usadas en el evento
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
  }

  // Procesar cada persona: obtener o crear como Person, crear check-in
  const createdCheckIns = []
  for (const personEntry of people) {
    let personId: string

    if (personEntry.personId) {
      const existingPerson = await Person.findById(personEntry.personId)
      if (!existingPerson) {
        throw createError({ statusCode: 400, statusMessage: `La persona ${personEntry.name || personEntry.personId} no existe` })
      }
      personId = existingPerson._id.toString()

      // Verificar que la persona no esté ya registrada en este evento
      const alreadyCheckedIn = await EventCheckIn.findOne({ event: eventDoc._id, person: personId })
      if (alreadyCheckedIn) {
        throw createError({
          statusCode: 409,
          statusMessage: `La persona ${existingPerson.name} ya está registrada en este evento`,
        })
      }
    } else {
      if (!personEntry.name) {
        throw createError({ statusCode: 400, statusMessage: 'El nombre de la persona es requerido' })
      }

      const newPerson = await Person.create({
        name: personEntry.name,
        phone: personEntry.phone || undefined,
      })
      personId = newPerson._id.toString()
    }

    // Validar rango de edad si el ministerio del evento lo define (ej. ministerio de edad)
    if (eventMinAge !== null && eventMaxAge !== null) {
      const personDoc = await Person.findById(personId).select('name birthDate').lean()
      const age = personDoc?.birthDate ? childAge(personDoc.birthDate) : null
      if (age === null || age < eventMinAge || age > eventMaxAge) {
        const displayAge = age === null ? 'desconocida' : `${age} años`
        throw createError({
          statusCode: 400,
          statusMessage: `La persona ${personDoc?.name || ''} tiene ${displayAge} y el ministerio acepta de ${eventMinAge} a ${eventMaxAge} años`,
        })
      }
    }

    const wristbandNumber = personEntry.wristbandNumber?.trim() || undefined
    const checkIn = await EventCheckIn.create({
      event: eventDoc._id,
      person: personId,
      checkInMethod: wristbandNumber ? 'wristband' : 'manual',
      wristbandNumber,
      checkInTime: new Date(),
    })

    const personDoc = await Person.findById(personId).select('name').lean()
    createdCheckIns.push({
      id: checkIn._id.toString(),
      personId,
      name: personDoc?.name ?? '',
      wristbandNumber: checkIn.wristbandNumber ?? '',
      checkInTime: checkIn.checkInTime,
      age: null,
    })
  }

  return {
    success: true,
    checkIns: createdCheckIns,
  }
})