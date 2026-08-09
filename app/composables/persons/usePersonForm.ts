// ============================================================
// Composable de Formulario de Persona - patrón Users
// ============================================================
import { ref } from 'vue'
import { z } from 'zod'

export const personFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  address: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  membershipDate: z.string().optional(),
  baptismDate: z.string().optional(),
})

export type PersonFormData = z.infer<typeof personFormSchema>

export const usePersonForm = () => {
  const saving = ref(false)
  const submitError = ref('')
  const fieldErrors = ref<Record<string, string | undefined>>({})

  const fieldSchemas = personFormSchema.shape

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
    const result = personFormSchema.safeParse(formData)

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>
      Object.keys(errors).forEach((field) => {
        fieldErrors.value[field] = errors[field]?.[0]
      })
      return false
    }

    return true
  }

  // Convierte fechas ISO a yyyy-mm-dd para campos date
  const toDateInputValue = (date: Date | string | null | undefined): string => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0] ?? ''
  }

  const loadPerson = async (personId: string): Promise<Record<string, any> | null> => {
    try {
      const url: string = `/api/persons/${personId}`
      const person = await $fetch(url) as any
      return {
        name: person?.name ?? '',
        birthDate: toDateInputValue(person?.birthDate),
        phone: person?.phone ?? '',
        email: person?.email ?? '',
        gender: person?.gender ?? '',
        address: person?.address ?? '',
        maritalStatus: person?.maritalStatus ?? '',
        membershipDate: toDateInputValue(person?.membershipDate),
        baptismDate: toDateInputValue(person?.baptismDate),
      }
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || 'Error al cargar la persona'
      return null
    }
  }

  const savePerson = async (
    formData: Record<string, any>,
    personId?: string
  ) => {
    submitError.value = ''

    if (!validateForm(formData)) {
      return false
    }

    saving.value = true

    try {
      const isEditing = !!personId
      const method = isEditing ? 'PUT' : 'POST'
      const url: string = isEditing ? `/api/persons/${personId}` : '/api/persons'

      await $fetch(url, { method, body: formData })

      return true
    } catch (err: any) {
      submitError.value = err?.data?.statusMessage || err?.message || 'Error al guardar la persona.'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    submitError,
    fieldErrors,
    savePerson,
    loadPerson,
    validateForm,
    validateField,
    toDateInputValue,
  }
}