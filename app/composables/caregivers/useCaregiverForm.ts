import { ref } from 'vue'
import { z } from 'zod'

export const caregiverFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
})

export type CaregiverFormData = z.infer<typeof caregiverFormSchema>

export const useCaregiverForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  const fieldSchemas = caregiverFormSchema.shape

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
    const result = caregiverFormSchema.safeParse(formData)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }

    return true
  }

  const saveCaregiver = async (
    formData: {
      name: string
      phone?: string
    },
    caregiverId?: string
  ) => {
    submitError.value = ''

    if (!validateForm(formData)) {
      return false
    }

    saving.value = true

    try {
      const isEditing = !!caregiverId
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/caregivers/${caregiverId}` : '/api/caregivers'

      await $fetch(url, { method, body: formData })

      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar el acudiente.'
      return false
    } finally {
      saving.value = false
    }
  }

  const deleteCaregiver = async (caregiverId: string) => {
    submitError.value = ''
    saving.value = true

    try {
      await $fetch(`/api/caregivers/${caregiverId}`, { method: 'DELETE' })
      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al eliminar el acudiente.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    saveCaregiver,
    deleteCaregiver,
    validateForm,
    validateField,
  }
}