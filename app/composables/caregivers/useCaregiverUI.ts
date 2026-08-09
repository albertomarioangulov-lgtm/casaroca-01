export const useCaregiverUI = () => {
  const isFormOpen = useState<boolean>('caregiver-form-open', () => false)
  const selectedCaregiver = useState<Record<string, any> | null>('caregiver-selected', () => null)

  const openCreate = () => {
    selectedCaregiver.value = null
    isFormOpen.value = true
  }

  const openEdit = (caregiver: Record<string, any>) => {
    selectedCaregiver.value = caregiver
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
  }

  return { isFormOpen, selectedCaregiver, openCreate, openEdit, closeForm }
}