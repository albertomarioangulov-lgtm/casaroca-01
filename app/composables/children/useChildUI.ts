export const useChildUI = () => {
  const isFormOpen = useState<boolean>('child-form-open', () => false)
  const selectedChild = useState<Record<string, any> | null>('child-selected', () => null)

  const openCreate = () => {
    selectedChild.value = null
    isFormOpen.value = true
  }

  const openEdit = (child: Record<string, any>) => {
    selectedChild.value = child
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
  }

  return { isFormOpen, selectedChild, openCreate, openEdit, closeForm }
}