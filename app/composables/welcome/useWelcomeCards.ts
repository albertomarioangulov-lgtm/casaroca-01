import { ref, watch } from 'vue'

export const useWelcomeCards = () => {
  const cards = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')

  // Pagination state
  const total = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(15)
  const totalPages = ref(1)
  const sortBy = ref('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const visitorType = ref('')
  const followUpStatus = ref('')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const fetchCards = async () => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch('/api/welcome-cards', {
        params: {
          page: page.value,
          limit: itemsPerPage.value,
          search: search.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
          visitorType: visitorType.value || undefined,
          followUpStatus: followUpStatus.value || undefined,
        },
      }) as any
      cards.value = result.items
      total.value = result.total
      page.value = result.page
      itemsPerPage.value = result.limit
      totalPages.value = result.totalPages
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver las tarjetas de conexión'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar tarjetas de conexión'
      }
    } finally {
      loading.value = false
    }
  }

  const handleUpdateOptions = (options: any) => {
    page.value = options.page || 1
    itemsPerPage.value = options.itemsPerPage || 15
    if (options.sortBy?.length) {
      sortBy.value = options.sortBy[0].key
      sortOrder.value = options.sortBy[0].order || 'desc'
    } else {
      sortBy.value = 'createdAt'
      sortOrder.value = 'desc'
    }
    fetchCards()
  }

  const clearFilters = () => {
    search.value = ''
    visitorType.value = ''
    followUpStatus.value = ''
    page.value = 1
    fetchCards()
  }

  const deleteCard = async (cardId: string) => {
    error.value = ''
    try {
      await $fetch(`/api/welcome-cards/${cardId}`, { method: 'DELETE' })
      await fetchCards()
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || 'Error al eliminar la tarjeta'
      return false
    }
  }

  // Debounced search
  watch(search, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      page.value = 1
      fetchCards()
    }, 400)
  })

  // Filtro por estado de seguimiento
  watch(followUpStatus, () => {
    page.value = 1
    fetchCards()
  })

  return {
    cards,
    loading,
    error,
    search,
    visitorType,
    followUpStatus,
    total,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    fetchCards,
    handleUpdateOptions,
    clearFilters,
    deleteCard,
  }
}
