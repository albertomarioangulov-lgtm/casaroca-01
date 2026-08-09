// ============================================================
// Composable de Personas (listado) - patrón Users
// ============================================================
import { ref, watch } from 'vue'

export const usePersons = () => {
  const persons = ref<Array<Record<string, any>>>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const search = ref('')
  const ministryFilter = ref('')

  // Paginación y orden
  const page = ref(1)
  const itemsPerPage = ref(15)
  const totalPages = ref(1)
  const sortBy = ref('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const fetchPersons = async () => {
    error.value = ''
    loading.value = true
    try {
      const query: Record<string, any> = {
        page: page.value,
        limit: itemsPerPage.value,
        search: search.value || undefined,
        ministryId: ministryFilter.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      }
      const result = await $fetch('/api/persons', { query }) as any
      persons.value = result.items
      total.value = result.total
      page.value = result.page
      itemsPerPage.value = result.limit
      totalPages.value = result.totalPages
    } catch (err: any) {
      if (err?.statusCode === 403) {
        error.value = 'No tienes permiso para ver personas'
      } else {
        error.value = err?.data?.statusMessage || 'Error al cargar personas'
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
    fetchPersons()
  }

  const clearFilters = () => {
    search.value = ''
    ministryFilter.value = ''
    page.value = 1
    fetchPersons()
  }

  // Búsqueda debounced
  watch(search, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      page.value = 1
      fetchPersons()
    }, 400)
  })

  // Cambios de página/paginación/filtro de ministerio → refetch
  watch([page, itemsPerPage, ministryFilter], () => {
    fetchPersons()
  })

  return {
    persons,
    total,
    loading,
    error,
    search,
    ministryFilter,
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
    fetchPersons,
    handleUpdateOptions,
    clearFilters,
  }
}