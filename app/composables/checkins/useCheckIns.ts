import { ref } from 'vue'

export const useCheckIns = () => {
  const checkIns = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref('')
  const successMessage = ref('')
  const totalInside = ref(0)
  const totalOut = ref(0)
  const search = ref('')
  const statusFilter = ref<string>('') // '' | 'inside' | 'out'

  // UI state para el check-out
  const isCheckOutOpen = useState<boolean>('checkout-open', () => false)
  const selectedCheckIn = useState<Record<string, any> | null>('checkout-selected', () => null)

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const fetchCheckIns = async (eventId: string) => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch(`/api/events/${eventId}/checkins`, {
        params: {
          search: search.value,
          status: statusFilter.value || undefined,
        },
      }) as any
      checkIns.value = result.items
      totalInside.value = result.totalInside
      totalOut.value = result.totalOut
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver los registros del evento'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar los registros del evento'
      }
    } finally {
      loading.value = false
    }
  }

  const createCheckIn = async (payload: any) => {
    error.value = ''
    successMessage.value = ''
    loading.value = true
    try {
      await $fetch('/api/checkins', {
        method: 'POST',
        body: payload,
      })
      successMessage.value = 'Ingreso registrado correctamente'
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error al registrar el ingreso'
      return false
    } finally {
      loading.value = false
    }
  }

  const openCheckOut = (checkIn: Record<string, any>) => {
    selectedCheckIn.value = checkIn
    isCheckOutOpen.value = true
  }

  const closeCheckOut = () => {
    selectedCheckIn.value = null
    isCheckOutOpen.value = false
  }

  const checkOut = async (payload: { wristbandNumber: string; caregiverId: string }) => {
    const checkInId = selectedCheckIn.value?.id
    if (!checkInId) return false

    error.value = ''
    successMessage.value = ''
    loading.value = true
    try {
      await $fetch(`/api/checkins/${checkInId}/checkout`, {
        method: 'PUT',
        body: payload,
      })
      successMessage.value = 'Salida registrada correctamente'
      closeCheckOut()
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error al registrar la salida'
      return false
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    checkIns.value = []
    error.value = ''
    successMessage.value = ''
    search.value = ''
    statusFilter.value = ''
    totalInside.value = 0
    totalOut.value = 0
  }

  // Debounced search
  const setupSearchWatcher = (eventId: string) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      fetchCheckIns(eventId)
    }, 400)
  }

  return {
    checkIns,
    loading,
    error,
    successMessage,
    totalInside,
    totalOut,
    search,
    statusFilter,
    isCheckOutOpen,
    selectedCheckIn,
    fetchCheckIns,
    createCheckIn,
    openCheckOut,
    closeCheckOut,
    checkOut,
    reset,
    setupSearchWatcher,
  }
}