import { ref, watch } from 'vue'

export const useUsers = () => {
  const users = ref<Array<Record<string, any>>>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')
  const roleFilter = ref<string | undefined>(undefined)
  const dateFrom = ref<string | undefined>(undefined)
  const dateTo = ref<string | undefined>(undefined)

  // Pagination state
  const total = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(15)
  const totalPages = ref(1)
  const sortBy = ref('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  let lastRoleFilter: string | undefined = undefined
  let lastDateFrom: string | undefined = undefined
  let lastDateTo: string | undefined = undefined

  const fetchUsers = async () => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch('/api/users', {
        params: {
          page: page.value,
          limit: itemsPerPage.value,
          search: search.value,
          role: roleFilter.value || undefined,
          dateFrom: formatDateParam(dateFrom.value),
          dateTo: formatDateParam(dateTo.value),
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
        },
      }) as any
      users.value = result.items
      total.value = result.total
      page.value = result.page
      itemsPerPage.value = result.limit
      totalPages.value = result.totalPages
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver usuarios'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar usuarios'
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
    fetchUsers()
  }

  const clearFilters = () => {
    roleFilter.value = undefined
    dateFrom.value = undefined
    dateTo.value = undefined
    search.value = ''
    page.value = 1
    fetchUsers()
  }

  // Debounced search
  watch(search, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      page.value = 1
      fetchUsers()
    }, 400)
  })

  watch([roleFilter, dateFrom, dateTo], () => {
    // Only trigger fetch if values have actually changed (avoid focus/blur triggers)
    const currentFrom = formatDateParam(dateFrom.value)
    const currentTo = formatDateParam(dateTo.value)
    if (lastRoleFilter === roleFilter.value && lastDateFrom === currentFrom && lastDateTo === currentTo) return
    lastRoleFilter = roleFilter.value
    lastDateFrom = currentFrom
    lastDateTo = currentTo

    if (filterTimeout) clearTimeout(filterTimeout)
    filterTimeout = setTimeout(() => {
      page.value = 1
      fetchUsers()
    }, 300)
  })

  return {
    users,
    loading,
    error,
    search,
    roleFilter,
    dateFrom,
    dateTo,
    total,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    fetchUsers,
    handleUpdateOptions,
    clearFilters,
  }
}