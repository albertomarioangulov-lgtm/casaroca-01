export const useUserUI = () => {
  const isFormOpen = useState<boolean>('user-form-open', () => false)
  const selectedUser = useState<Record<string, any> | null>('user-selected', () => null)

  const openCreate = () => {
    selectedUser.value = null
    isFormOpen.value = true
  }

  const openEdit = (user: Record<string, any>) => {
    selectedUser.value = user
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
  }

  return { isFormOpen, selectedUser, openCreate, openEdit, closeForm }
}