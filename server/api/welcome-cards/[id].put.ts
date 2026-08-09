import { z } from 'zod'
import { WelcomeCard } from '~~/server/models/WelcomeCard'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'
import { CHURCH_CAMPUSES, AFFINITY_GROUPS, FOLLOW_UP_INTERESTS, REGISTRATION_ORIGINS } from '~~/shared/welcomeCard'

const campusValues = CHURCH_CAMPUSES as readonly string[]
const affinityValues = AFFINITY_GROUPS.map(g => g.value)
const interestValues = FOLLOW_UP_INTERESTS.map(i => i.value)

const updateWelcomeCardSchema = z.object({
  eventId: z.string().nullable().optional(),
  registrationDate: z.string().nullable().optional(),
  visitorType: z.enum(['first_time', 'update_info']).nullable().optional(),
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  motivations: z.array(z.string()).nullable().optional(),
  motivationOther: z.string().nullable().optional(),
  acceptedJesus: z.enum(['yes', 'no']).nullable().optional(),
  connectionInterest: z.enum(['casa_roca_home', 'just_visiting']).nullable().optional(),
  wantsOtherCampus: z.enum(['yes', 'no']).nullable().optional(),
  campus: z.enum(campusValues as [string, ...string[]]).nullable().optional(),
  followUpInterests: z.array(z.enum(interestValues as [string, ...string[]])).nullable().optional(),
  affinityGroup: z.enum(affinityValues as [string, ...string[]]).nullable().optional(),
  spouseName: z.string().nullable().optional(),
  registrationOrigin: z.string().nullable().optional(),
  prayerRequest: z.string().nullable().optional(),
  acceptsDataPolicy: z.enum(['yes', 'no']).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.WELCOME_CARDS_UPDATE)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de tarjeta requerido' })
  }

  const body = await readBody(event)
  const result = updateWelcomeCardSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de tarjeta de conexión fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData: Record<string, any> = { ...result.data }
  if ('eventId' in updateData) {
    const eventId = updateData.eventId
    delete updateData.eventId
    updateData.event = eventId || undefined
  }
  if ('registrationDate' in updateData) {
    if (updateData.registrationDate) {
      updateData.registrationDate = new Date(updateData.registrationDate)
    } else {
      updateData.registrationDate = undefined
    }
  }
  // Limpiar campos vacíos
  for (const field of ['motivationOther', 'spouseName', 'prayerRequest']) {
    if (field in updateData && !updateData[field]) {
      updateData[field] = undefined
    }
  }
  if ('email' in updateData && !updateData.email) {
    updateData.email = undefined
  }

  const cardDoc = await WelcomeCard.findByIdAndUpdate(id, updateData, { new: true }).lean()

  if (!cardDoc) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta de conexión no encontrada' })
  }

  const c: any = cardDoc
  return {
    id: c._id?.toString?.() ?? '',
    name: c.name,
    updatedAt: c.updatedAt,
  }
})