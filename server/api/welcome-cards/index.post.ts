import { z } from 'zod'
import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { Person } from '~~/server/models/Person'
import { Event } from '~~/server/models/Event'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { CHURCH_CAMPUSES, AFFINITY_GROUPS, FOLLOW_UP_INTERESTS, REGISTRATION_ORIGINS, VISIT_MOTIVATIONS } from '~~/shared/welcomeCard'

const campusValues = CHURCH_CAMPUSES as readonly string[]
const affinityValues = AFFINITY_GROUPS.map(g => g.value)
const interestValues = FOLLOW_UP_INTERESTS.map(i => i.value)
const motivationValues = VISIT_MOTIVATIONS.map(m => m.value)

const createWelcomeCardSchema = z.object({
  // Persona (opcional si ya existe; si no, se crea)
  personId: z.string().optional(),
  eventId: z.string().optional(),
  // Visitante
  registrationDate: z.string().optional(),
  visitorType: z.enum(['first_time', 'update_info']).optional(),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  motivations: z.array(z.enum(motivationValues as [string, ...string[]])).optional(),
  motivationOther: z.string().optional(),
  // Interés
  acceptedJesus: z.enum(['yes', 'no']).optional(),
  connectionInterest: z.enum(['casa_roca_home', 'just_visiting']).optional(),
  wantsOtherCampus: z.enum(['yes', 'no']).optional(),
  campus: z.enum(campusValues as [string, ...string[]]).optional(),
  followUpInterests: z.array(z.enum(interestValues as [string, ...string[]])).optional(),
  affinityGroup: z.enum(affinityValues as [string, ...string[]]).optional(),
  spouseName: z.string().optional(),
  // Internos
  registrationOrigin: z.enum(REGISTRATION_ORIGINS as unknown as [string, ...string[]]).optional(),
  prayerRequest: z.string().optional(),
  // Consentimiento
  acceptsDataPolicy: z.enum(['yes', 'no']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_CREATE)

  const body = await readBody(event)
  const result = createWelcomeCardSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de tarjeta de conexión fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const data = result.data

  // 0. Validar estado del evento si la tarjeta se registra desde un evento
  if (data.eventId) {
    const eventDoc = await Event.findById(data.eventId)
    if (!eventDoc) {
      throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
    }
    if (eventDoc.status !== 'active') {
      const statusMessages: Record<string, string> = {
        scheduled: 'El evento está programado. Debes activarlo antes de registrar nuevos.',
        finished: 'El evento ya finalizó. No se puede registrar nuevos.',
        cancelled: 'El evento está cancelado. No se puede registrar nuevos.',
      }
      throw createError({
        statusCode: 400,
        statusMessage: statusMessages[eventDoc.status] || `El evento está en estado "${eventDoc.status}". Actívalo antes de registrar.`,
      })
    }
  }

  // 1. Determinar la persona: usar existente o crear nueva
  let person: any = null
  if (data.personId) {
    person = await Person.findById(data.personId)
    if (!person) {
      throw createError({ statusCode: 400, statusMessage: 'La persona seleccionada no existe' })
    }
  } else if (data.name && data.visitorType !== 'update_info') {
    // Crear persona nueva en primera visita
    if (data.email || data.phone) {
      const existing = await Person.findOne({
        $or: [
          ...(data.email ? [{ email: data.email.toLowerCase() }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      })
      if (existing) {
        person = existing
      }
    }
    if (!person) {
      person = await Person.create({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        membershipDate: data.registrationDate ? new Date(data.registrationDate) : new Date(),
      })
    }
  }

  // 2. Si hay persona y la tarjeta trae correo/teléfono, actualizar si están vacíos
  if (person) {
    const updates: Record<string, any> = {}
    if (data.email && !person.email) updates.email = data.email.toLowerCase()
    if (data.phone && !person.phone) updates.phone = data.phone
    if (Object.keys(updates).length > 0) {
      await Person.findByIdAndUpdate(person._id, updates)
    }
  }

  // 3. Crear la tarjeta
  const cardDoc = await WelcomeCard.create({
    person: person?._id,
    personSnapshot: {
      name: data.name,
      phone: data.phone || person?.phone || '',
      email: data.email || person?.email || '',
    },
    event: data.eventId || undefined,
    registrationDate: data.registrationDate ? new Date(data.registrationDate) : new Date(),
    visitorType: data.visitorType,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    motivations: data.motivations ?? [],
    motivationOther: data.motivationOther || undefined,
    acceptedJesus: data.acceptedJesus,
    connectionInterest: data.connectionInterest,
    wantsOtherCampus: data.wantsOtherCampus,
    campus: data.campus,
    followUpInterests: data.followUpInterests ?? [],
    affinityGroup: data.affinityGroup,
    spouseName: data.spouseName || undefined,
    registrationOrigin: data.registrationOrigin,
    prayerRequest: data.prayerRequest || undefined,
    acceptsDataPolicy: data.acceptsDataPolicy,
  })

  return {
    id: cardDoc._id.toString(),
    personId: person?._id?.toString?.() ?? null,
    createdAt: cardDoc.createdAt,
  }
})