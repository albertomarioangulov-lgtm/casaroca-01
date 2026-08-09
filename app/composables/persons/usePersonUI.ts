export const usePersonUI = () => {
  const isFormOpen = useState<boolean>('person-form-open', () => false)
  const selectedPerson = useState<Record<string, any> | null>('person-selected', () => null)

  const openCreate = () => {
    selectedPerson.value = null
    isFormOpen.value = true
  }

  const openEdit = (person: Record<string, any>) => {
    selectedPerson.value = person
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
  }

  return { isFormOpen, selectedPerson, openCreate, openEdit, closeForm }
}