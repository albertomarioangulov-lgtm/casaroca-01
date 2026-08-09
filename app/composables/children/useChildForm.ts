import { ref } from 'vue'
import { z } from 'zod'

export const childFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  birthDate: z.string().optional(),
})

export type ChildFormData = z.infer<typeof childFormSchema>

export const useChildForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  const fieldSchemas = childFormSchema.shape

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
    const result = childFormSchema.safeParse(formData)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }

    return true
  }

  const saveChild = async (
    formData: {
      name: string
      birthDate?: string
    },
    childId?: string
  ) => {
    submitError.value = ''

    if (!validateForm(formData)) {
      return false
    }

    saving.value = true

    try {
      const isEditing = !!childId
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/children/${childId}` : '/api/children'

      await $fetch(url, { method, body: formData })

      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar el niño.'
      return false
    } finally {
      saving.value = false
    }
  }

  const deleteChild = async (childId: string) => {
    submitError.value = ''
    saving.value = true

    try {
      await $fetch(`/api/children/${childId}`, { method: 'DELETE' })
      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al eliminar el niño.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    saveChild,
    deleteChild,
    validateForm,
    validateField,
  }
}