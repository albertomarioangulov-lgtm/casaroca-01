import { ref } from 'vue'
import { z } from 'zod'

// Esquema del formulario de Tarjeta de Conexión
export const welcomeCardSchema = z.object({
  // Persona
  personId: z.string().optional(),
  // Visitante
  registrationDate: z.string().optional(),
  visitorType: z.enum(['first_time', 'update_info']).optional(),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  motivations: z.array(z.string()).optional(),
  motivationOther: z.string().optional(),
  // Interés
  acceptedJesus: z.enum(['yes', 'no']).optional(),
  connectionInterest: z.enum(['casa_roca_home', 'just_visiting']).optional(),
  wantsOtherCampus: z.enum(['yes', 'no']).optional(),
  campus: z.string().optional(),
  followUpInterests: z.array(z.string()).optional(),
  affinityGroup: z.string().optional(),
  spouseName: z.string().optional(),
  // Internos
  registrationOrigin: z.string().optional(),
  prayerRequest: z.string().optional(),
  // Consentimiento
  acceptsDataPolicy: z.enum(['yes', 'no']).optional(),
})

export type WelcomeCardFormData = z.infer<typeof welcomeCardSchema>

export const useWelcomeCardForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  // Búsqueda de persona existente
  const personSearch = ref('')
  const searchResults = ref<Array<Record<string, any>>>([])
  const searchLoading = ref(false)
  const selectedPerson = ref<Record<string, any> | null>(null)
  const creatingNewPerson = ref(false)

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const searchPersons = async (query: string) => {
    if (!query || query.trim().length < 3) {
      searchResults.value = []
      return
    }
    searchLoading.value = true
    try {
      const data = await $fetch('/api/persons', {
        query: { search: query, limit: 8 },
      }) as any
      searchResults.value = data?.items ?? []
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }

  const startPersonSearch = (query: string) => {
    personSearch.value = query
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => searchPersons(query), 400)
  }

  const selectPerson = (person: Record<string, any>) => {
    selectedPerson.value = person
    creatingNewPerson.value = false
    searchResults.value = []
    personSearch.value = ''
    // Prellenar datos del formulario
    form.value.personId = person.id
    form.value.name = person.name || form.value.name
    form.value.phone = person.phone || form.value.phone
    form.value.email = person.email || form.value.email
  }

  const startNewPerson = () => {
    creatingNewPerson.value = true
    selectedPerson.value = null
    form.value.personId = ''
    searchResults.value = []
    personSearch.value = ''
  }

  const resetPersonSelection = () => {
    selectedPerson.value = null
    creatingNewPerson.value = false
    form.value.personId = ''
    searchResults.value = []
    personSearch.value = ''
  }

  // Estado del wizard (1-based: pasos 1..5)
  const step = ref(1)
  const maxStep = ref(5)
  const stepsDone = ref<Set<number>>(new Set())

  const markStepDone = (s: number) => {
    stepsDone.value.add(s)
  }

  const gotoStep = (s: number) => {
    step.value = Math.min(Math.max(s, 1), maxStep.value)
  }

  const nextStep = () => {
    if (step.value < maxStep.value) {
      step.value++
    }
  }

  const prevStep = () => {
    if (step.value > 1) {
      step.value--
    }
  }

  // Formulario reactivo
  const form = ref<WelcomeCardFormData>({
    personId: '',
    registrationDate: new Date().toISOString().split('T')[0] ?? '',
    visitorType: 'first_time',
    name: '',
    email: '',
    phone: '',
    motivations: [],
    motivationOther: '',
    acceptedJesus: undefined,
    connectionInterest: undefined,
    wantsOtherCampus: undefined,
    campus: '',
    followUpInterests: [],
    affinityGroup: '',
    spouseName: '',
    registrationOrigin: '',
    prayerRequest: '',
    acceptsDataPolicy: undefined,
  })

  const resetForm = () => {
    form.value = {
      personId: '',
      registrationDate: new Date().toISOString().split('T')[0] ?? '',
      visitorType: 'first_time',
      name: '',
      email: '',
      phone: '',
      motivations: [],
      motivationOther: '',
      acceptedJesus: undefined,
      connectionInterest: undefined,
      wantsOtherCampus: undefined,
      campus: '',
      followUpInterests: [],
      affinityGroup: '',
      spouseName: '',
      registrationOrigin: '',
      prayerRequest: '',
      acceptsDataPolicy: undefined,
    }
    resetPersonSelection()
    stepsDone.value = new Set()
    step.value = 1
  }

  const loadCard = (card: Record<string, any>) => {
    form.value = {
      personId: card.personId || '',
      registrationDate: card.registrationDate ? (new Date(card.registrationDate).toISOString().split('T')[0] ?? '') : '',
      visitorType: card.visitorType || 'first_time',
      name: card.name || '',
      email: card.email || '',
      phone: card.phone || '',
      motivations: card.motivations || [],
      motivationOther: card.motivationOther || '',
      acceptedJesus: card.acceptedJesus || undefined,
      connectionInterest: card.connectionInterest || undefined,
      wantsOtherCampus: card.wantsOtherCampus || undefined,
      campus: card.campus || '',
      followUpInterests: card.followUpInterests || [],
      affinityGroup: card.affinityGroup || '',
      spouseName: card.spouseName || '',
      registrationOrigin: card.registrationOrigin || '',
      prayerRequest: card.prayerRequest || '',
      acceptsDataPolicy: card.acceptsDataPolicy || undefined,
    }
    if (card.personId) {
      selectedPerson.value = {
        id: card.personId,
        name: card.personName || card.name,
      }
    }
    stepsDone.value = new Set()
    step.value = 1
  }

  const validateForm = (): boolean => {
    fieldErrors.value = {}
    const result = welcomeCardSchema.safeParse(form.value)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }
    // Validación de negocio: si "Casa Roca mi casa" y quiere otra sede, se requiere campus
    const f = form.value
    if (f.connectionInterest === 'casa_roca_home' && f.wantsOtherCampus === 'yes' && !f.campus) {
      fieldErrors.value.campus = 'Selecciona la sede'
      return false
    }
    if (f.visitorType === 'update_info' && !f.personId) {
      fieldErrors.value.personSearch = 'Debes seleccionar una persona existente para actualizar su información'
      return false
    }
    return true
  }

  const saveCard = async (eventId?: string, cardId?: string) => {
    submitError.value = ''
    if (!validateForm()) return false

    saving.value = true
    try {
      // Convertir campos vacíos a undefined para no fallar la validación zod del backend
      // (campus/affinityGroup/registrationOrigin son enums; '' no es válido)
      const payload: Record<string, any> = {
        ...form.value,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        eventId: eventId || undefined,
        campus: form.value.campus || undefined,
        affinityGroup: form.value.affinityGroup || undefined,
        registrationOrigin: form.value.registrationOrigin || undefined,
        spouseName: form.value.spouseName || undefined,
        motivationOther: form.value.motivationOther || undefined,
        prayerRequest: form.value.prayerRequest || undefined,
        acceptedJesus: form.value.acceptedJesus || undefined,
        connectionInterest: form.value.connectionInterest || undefined,
        wantsOtherCampus: form.value.wantsOtherCampus || undefined,
        acceptsDataPolicy: form.value.acceptsDataPolicy || undefined,
        motivations: form.value.motivations ?? [],
        followUpInterests: form.value.followUpInterests ?? [],
      }

      if (cardId) {
        await $fetch(`/api/welcome-cards/${cardId}`, { method: 'PUT', body: payload })
      } else {
        await $fetch('/api/welcome-cards', { method: 'POST', body: payload })
      }
      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar la tarjeta de conexión.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    form,
    step,
    maxStep,
    stepsDone,
    markStepDone,
    gotoStep,
    nextStep,
    prevStep,
    resetForm,
    loadCard,
    saveCard,
    validateForm,
    // Persona
    personSearch,
    searchResults,
    searchLoading,
    selectedPerson,
    creatingNewPerson,
    startPersonSearch,
    selectPerson,
    startNewPerson,
    resetPersonSelection,
  }
}