<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()
const { openEdit } = useEventUI()

const {
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
} = useEvents()

// View mode: 'table' | 'cards'
const viewMode = ref<'table' | 'cards'>('table')

const initializeViewMode = () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('events-view-mode')
  } catch {}
  if (stored === 'table' || stored === 'cards') {
    viewMode.value = stored
  } else {
    viewMode.value = window.innerWidth < 768 ? 'cards' : 'table'
  }
}

const toggleView = () => {
  viewMode.value = viewMode.value === 'table' ? 'cards' : 'table'
  try {
    localStorage.setItem('events-view-mode', viewMode.value)
  } catch {}
}

const handleEdit = (event: Record<string, any>) => {
  openEdit(event)
}

const handleView = (event: Record<string, any>) => {
  navigateTo(`/events/${event.id}`)
}

const handleSaved = () => {
  fetchEvents()
}

onMounted(() => {
  initializeViewMode()

  window.addEventListener('resize', () => {
    try {
      const stored = localStorage.getItem('events-view-mode')
      if (!stored) {
        viewMode.value = window.innerWidth < 768 ? 'cards' : 'table'
      }
    } catch {}
  })

  if (can(PERMISSIONS.EVENTS_READ)) {
    fetchEvents()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.EVENTS_READ)">
    <h2 class="text-h6 font-weight-bold mb-2 mt-0">
      Eventos
    </h2>

    <v-toolbar>
      <v-text-field flat class="ml-1"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar evento..."
      />
      <v-btn
        variant="text"
        :icon="viewMode === 'table' ? 'mdi-view-grid-outline' : 'mdi-view-list-outline'"
        :title="viewMode === 'table' ? 'Vista tarjetas' : 'Vista tabla'"
        @click="toggleView"
        class="mr-2"
      />
      <EventsBtnCreate />
    </v-toolbar>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <EventsTable
      v-if="viewMode === 'table'"
      :items="events"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @edit="handleEdit"
      @view="handleView"
      @update:options="handleUpdateOptions"
    />

    <EventsCards
      v-else
      :items="events"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @edit="handleEdit"
      @view="handleView"
      @update:options="handleUpdateOptions"
    />

    <EventsForm @saved="handleSaved" />
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>