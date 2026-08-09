<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()
const { openEdit } = useUserUI()

const {
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
} = useUsers()

// View mode: 'table' | 'cards'
const viewMode = ref<'table' | 'cards'>('table')

const initializeViewMode = () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('users-view-mode')
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
    localStorage.setItem('users-view-mode', viewMode.value)
  } catch {}
}

// Filters collapsible
const showFilters = ref(false)

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const activeFilterCount = computed(() => {
  let count = 0
  if (roleFilter.value) count++
  if (dateFrom.value) count++
  if (dateTo.value) count++
  return count
})

const roleOptions = [
  { title: 'Administrador', value: 'admin' },
  { title: 'Conductor', value: 'driver' },
  { title: 'Empleado', value: 'employee' },
  { title: 'Visitante', value: 'viewer' },
]

const handleEdit = (user: Record<string, any>) => {
  openEdit(user)
}

const handleSaved = () => {
  fetchUsers()
}

onMounted(() => {
  initializeViewMode()

  window.addEventListener('resize', () => {
    try {
      const stored = localStorage.getItem('users-view-mode')
      if (!stored) {
        viewMode.value = window.innerWidth < 768 ? 'cards' : 'table'
      }
    } catch {}
  })

  if (can(PERMISSIONS.USERS_READ)) {
    fetchUsers()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.USERS_READ)">
    <h2 class="text-h6 font-weight-bold mb-2 mt-0">
      Usuarios
    </h2>

    <v-toolbar>
      <v-text-field flat class="ml-1"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
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
      <UsersBtnCreate />
    </v-toolbar>

    <div v-show="showFilters" class="mb-3 pa-3" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 4px;">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="roleFilter"
            :items="roleOptions"
            item-title="title"
            item-value="value"
            label="Rol"
            clearable
            :menu-props="{ zIndex: 9999 }"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-date-input
            v-model="dateFrom"
            label="Fecha desde"
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-date-input
            v-model="dateTo"
            label="Fecha hasta"
            clearable
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

    <UsersTable
      v-if="viewMode === 'table'"
      :items="users"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @edit="handleEdit"
      @update:options="handleUpdateOptions"
    />

    <UsersCards
      v-else
      :items="users"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @edit="handleEdit"
      @update:options="handleUpdateOptions"
    />

    <UsersForm @saved="handleSaved" />
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>