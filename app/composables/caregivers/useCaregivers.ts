import { ref, watch } from 'vue'

export const useCaregivers = () => {
  const caregivers = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')

  const total = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(15)
  const totalPages = ref(1)
  const sortBy = ref('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const fetchCaregivers = async () => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch('/api/caregivers', {
        params: {
          page: page.value,
          limit: itemsPerPage.value,
          search: search.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
        },
      }) as any
      caregivers.value = result.items
      total.value = result.total
      page.value = result.page
      itemsPerPage.value = result.limit
      totalPages.value = result.totalPages
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver acudientes'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar acudientes'
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
    fetchCaregivers()
  }

  const clearFilters = () => {
    search.value = ''
    page.value = 1
    fetchCaregivers()
  }

  watch(search, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      page.value = 1
      fetchCaregivers()
    }, 400)
  })

  return {
    caregivers,
    loading,
    error,
    search,
    total,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    fetchCaregivers,
    handleUpdateOptions,
    clearFilters,
  }
}