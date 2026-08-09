<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const {
  persons,
  loading,
  error,
  search,
  ministryFilter,
  total,
  page,
  itemsPerPage,
  sortBy,
  sortOrder,
  fetchPersons,
  handleUpdateOptions,
  clearFilters,
} = usePersons()

// View mode: 'table' | 'cards'
const viewMode = ref<'table' | 'cards'>('table')

const initializeViewMode = () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('persons-view-mode')
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
    localStorage.setItem('persons-view-mode', viewMode.value)
  } catch {}
}

// Filters collapsible
const showFilters = ref(false)

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const activeFilterCount = computed(() => {
  let count = 0
  if (ministryFilter.value) count++
  return count
})

const { data: ministries } = await useFetch('/api/ministries', {
  headers: useRequestHeaders(['cookie']),
})

const handleSaved = () => {
  fetchPersons()
}

onMounted(() => {
  initializeViewMode()

  window.addEventListener('resize', () => {
    try {
      const stored = localStorage.getItem('persons-view-mode')
      if (!stored) {
        viewMode.value = window.innerWidth < 768 ? 'cards' : 'table'
      }
    } catch {}
  })

  if (can(PERMISSIONS.PERSONS_READ)) {
    fetchPersons()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.PERSONS_READ)">
    <h2 class="text-h6 font-weight-bold mb-2 mt-0">
      Personas
    </h2>

    <v-toolbar>
      <v-text-field flat class="ml-1"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar por nombre, teléfono o email"
      />
      <v-btn
        variant="text"
        :color="activeFilterCount > 0 ? 'primary' : undefined"
        prepend-icon="mdi-filter-outline"
        @click="toggleFilters"
      >
        Filtros
        <v-badge
          v-if="activeFilterCount > 0"
          :content="activeFilterCount"
          color="primary"
          size="x-small"
          inline
          class="ml-1"
        />
      </v-btn>
      <v-btn
        variant="text"
        :icon="viewMode === 'table' ? 'mdi-view-grid-outline' : 'mdi-view-list-outline'"
        :title="viewMode === 'table' ? 'Vista tarjetas' : 'Vista tabla'"
        @click="toggleView"
        class="mr-2"
      />
      <PersonsBtnCreate />
    </v-toolbar>

    <div v-show="showFilters" class="mb-3 pa-3" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 4px;">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="ministryFilter"
            :items="(ministries as any)?.items ?? []"
            item-title="name"
            item-value="id"
            label="Ministerio"
            clearable
            :menu-props="{ zIndex: 9999 }"
          />
        </v-col>
      </v-row>
      <v-row dense class="mt-2">
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            variant="text"
            color="grey"
            size="small"
            prepend-icon="mdi-filter-remove-outline"
            @click="clearFilters"
          >
            Limpiar filtros
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <PersonsTable
      v-if="viewMode === 'table'"
      :items="persons"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @update:options="handleUpdateOptions"
    />

    <PersonsCards
      v-else
      :items="persons"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @update:options="handleUpdateOptions"
    />

    <PersonsForm @saved="handleSaved" />
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>