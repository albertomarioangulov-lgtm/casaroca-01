import { ref, watch } from 'vue'

export const useEvents = () => {
  const events = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')

  // Pagination state
  const total = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(15)
  const totalPages = ref(1)
  const sortBy = ref('date')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const fetchEvents = async () => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch('/api/events', {
        params: {
          page: page.value,
          limit: itemsPerPage.value,
          search: search.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
        },
      }) as any
      events.value = result.items
      total.value = result.total
      page.value = result.page
      itemsPerPage.value = result.limit
      totalPages.value = result.totalPages
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver eventos'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar eventos'
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
      sortBy.value = 'date'
      sortOrder.value = 'desc'
    }
    fetchEvents()
  }

  const clearFilters = () => {
    search.value = ''
    page.value = 1
    fetchEvents()
  }

  // Debounced search
  watch(search, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      page.value = 1
      fetchEvents()
    }, 400)
  })

  return {
    events,
    loading,
    error,
    search,
    total,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    fetchEvents,
    handleUpdateOptions,
    clearFilters,
  }
}