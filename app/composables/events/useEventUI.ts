export const useEventUI = () => {
  const isFormOpen = useState<boolean>('event-form-open', () => false)
  const selectedEvent = useState<Record<string, any> | null>('event-selected', () => null)
  const confirmDelete = useState<boolean>('event-confirm-delete', () => false)
  const eventToDelete = useState<Record<string, any> | null>('event-to-delete', () => null)

  const openCreate = () => {
    selectedEvent.value = null
    isFormOpen.value = true
  }

  const openEdit = (event: Record<string, any>) => {
    selectedEvent.value = event
    isFormOpen.value = true
  }

  const closeForm = () => {
    isFormOpen.value = false
  }

  const requestDelete = (event: Record<string, any>) => {
    eventToDelete.value = event
    confirmDelete.value = true
  }

  const cancelDelete = () => {
    eventToDelete.value = null
    confirmDelete.value = false
  }

  return { isFormOpen, selectedEvent, confirmDelete, eventToDelete, openCreate, openEdit, closeForm, requestDelete, cancelDelete }
}