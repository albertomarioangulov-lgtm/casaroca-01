import { ref } from 'vue'
import { z } from 'zod'

export const userFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  roles: z.string().optional(),
})

export type UserFormData = z.infer<typeof userFormSchema>

export const useUserForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  const fieldSchemas = userFormSchema.shape

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
    const result = userFormSchema.safeParse(formData)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }

    return true
  }

  const saveUser = async (
    formData: {
      name: string
      email: string
      password?: string
      roles: string
    },
    userId?: string
  ) => {
    submitError.value = ''

    if (!validateForm(formData)) {
      return false
    }

    saving.value = true

    try {
      const isEditing = !!userId
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/users/${userId}` : '/api/users'
      const body: any = {
        name: formData.name,
        email: formData.email,
        roles: formData.roles,
      }

      if (formData.password) {
        body.password = formData.password
      }

      if (isEditing && !formData.password) {
        delete body.password
      }

      await $fetch(url, { method, body })

      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar el usuario.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    saveUser,
    validateForm,
    validateField,
  }
}
