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
  // Contador para descartar respuestas obsoletas (al cambiar de evento/tab rápido)
  let fetchSeq = 0

  const fetchCheckIns = async (eventId: string) => {
    const seq = ++fetchSeq
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch(`/api/events/${eventId}/checkins`, {
        params: {
          search: search.value,
          status: statusFilter.value || undefined,
        },
      }) as any
      // Si llegó una petición más reciente, descartar esta respuesta
      if (seq !== fetchSeq) return
      checkIns.value = result.items
      totalInside.value = result.totalInside
      totalOut.value = result.totalOut
    } catch (err: any) {
      if (seq !== fetchSeq) return
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver los registros del evento'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar los registros del evento'
      }
    } finally {
      if (seq === fetchSeq) {
        loading.value = false
      }
    }
  }

  const createCheckIn = async (payload: any) => {
    error.value = ''
    successMessage.value = ''
    loading.value = true
    try {
      const response = await $fetch('/api/checkins', {
        method: 'POST',
        body: payload,
      }) as any
      const checkIns = response?.checkIns ?? []
      if (checkIns.length > 0) {
        const lines = checkIns.map((ci: any) => {
          if (ci.ageGroupName && ci.ageGroupName !== 'Sin grupo') {
            return `${ci.name || ci.personId}: ${ci.ageGroupName}`
          }
          if (ci.ageGroupName !== undefined) {
            return `${ci.name || ci.personId}: sin salón asignado`
          }
          return ci.name || ci.personId
        })
        successMessage.value = `Registrado:\n${lines.join('\n')}`
      } else {
        successMessage.value = 'Ingreso registrado correctamente'
      }
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error al registrar el ingreso'
      return false
    } finally {
      loading.value = false
    }
  }

  // Marcar la entrada de una persona pre-inscrita (invitado) directamente
  const checkInPerson = async (eventId: string, personId: string, wristbandNumber?: string) => {
    error.value = ''
    successMessage.value = ''
    loading.value = true
    try {
      await $fetch('/api/checkins', {
        method: 'POST',
        body: {
          eventId,
          people: [{
            personId,
            wristbandNumber: wristbandNumber || undefined,
          }],
        },
      })
      successMessage.value = 'Entrada registrada correctamente'
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error al registrar la entrada'
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

  const checkOut = async (payload: { wristbandNumber?: string; caregiverId?: string }) => {
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
    checkInPerson,
    openCheckOut,
    closeCheckOut,
    checkOut,
    reset,
    setupSearchWatcher,
  }
}