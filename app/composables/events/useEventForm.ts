import { ref } from 'vue'
import { z } from 'zod'

export const eventFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'finished', 'cancelled']).optional(),
  ministryId: z.string().optional(),
  parentEventId: z.string().optional(),
  includeRokaKids: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  requireWristband: z.boolean().optional(),
  trackCheckOut: z.boolean().optional(),
  type: z.enum(['regular', 'welcome', 'baptism', 'outreach']).optional(),
})

export type EventFormData = z.infer<typeof eventFormSchema>

export const useEventForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  const fieldSchemas = eventFormSchema.shape

  const validateField = (field: keyof typeof fieldSchemas, value: any) => {
    const schema = fieldSchemas[field]
    const result = schema.safeParse(value)

    if (!result.success) {
      fieldErrors.value[field] = result.error.issues[0]?.message
      return false
    }

    fieldErrors.value[field] = undefined
    return true
  }

  const validateForm = (formData: any) => {
    fieldErrors.value = {}
    const result = eventFormSchema.safeParse(formData)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }

    return true
  }

  const saveEvent = async (
    formData: {
      name: string
      date: string
      startTime?: string
      endTime?: string
      status?: string
      ministryId?: string
      parentEventId?: string
      includeRokaKids?: boolean
      welcomeEnabled?: boolean
      requireWristband?: boolean
      trackCheckOut?: boolean
      type?: string
    },
    eventId?: string
  ): Promise<{ success: boolean; warning?: string }> => {
    submitError.value = ''

    if (!validateForm(formData)) {
      return { success: false }
    }

    saving.value = true

    try {
      const isEditing = !!eventId
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/events/${eventId}` : '/api/events'

      const response = await $fetch(url, { method, body: formData }) as any

      return { success: true, warning: response?.warning || undefined }
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar el evento.'
      return { success: false }
    } finally {
      saving.value = false
    }
  }

  const deleteEvent = async (eventId: string) => {
    submitError.value = ''
    saving.value = true

    try {
      await $fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al eliminar el evento.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    saveEvent,
    deleteEvent,
    validateForm,
    validateField,
  }
}