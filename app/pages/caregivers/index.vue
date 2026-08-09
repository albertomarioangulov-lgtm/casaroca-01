<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()
const { openEdit } = useCaregiverUI()

const {
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
} = useCaregivers()

// View mode: 'table' | 'cards'
const viewMode = ref<'table' | 'cards'>('table')

const initializeViewMode = () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('caregivers-view-mode')
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
    localStorage.setItem('caregivers-view-mode', viewMode.value)
  } catch {}
}

const handleEdit = (caregiver: Record<string, any>) => {
  openEdit(caregiver)
}

const familyFormRef = ref<any>(null)

const handleSaved = () => {
  fetchCaregivers()
}

const openFamilyForm = () => {
  familyFormRef.value?.open()
}

onMounted(() => {
  initializeViewMode()

  window.addEventListener('resize', () => {
    try {
      const stored = localStorage.getItem('caregivers-view-mode')
      if (!stored) {
        viewMode.value = window.innerWidth < 768 ? 'cards' : 'table'
      }
    } catch {}
  })

  if (can(PERMISSIONS.CAREGIVERS_READ)) {
    fetchCaregivers()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.CAREGIVERS_READ)">
    <h2 class="text-h6 font-weight-bold mb-2 mt-0">
      Acudientes
    </h2>

    <v-toolbar>
      <v-text-field flat class="ml-1"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar acudiente por nombre o teléfono..."
      />
      <v-btn
        variant="text"
        :icon="viewMode === 'table' ? 'mdi-view-grid-outline' : 'mdi-view-list-outline'"
        :title="viewMode === 'table' ? 'Vista tarjetas' : 'Vista tabla'"
        @click="toggleView"
        class="mr-2"
      />
      <v-btn
        v-if="can(PERMISSIONS.CAREGIVERS_CREATE)"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-account-group"
        class="mr-2"
        @click="openFamilyForm"
      >
        Registrar familia
      </v-btn>
      <CaregiversBtnCreate />
    </v-toolbar>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <CaregiversTable
      v-if="viewMode === 'table'"
      :items="caregivers"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @edit="handleEdit"
      @update:options="handleUpdateOptions"
    />

    <CaregiversCards
      v-else
      :items="caregivers"
      :loading="loading"
      :total="total"
      :page="page"
      :items-per-page="itemsPerPage"
      @edit="handleEdit"
      @update:options="handleUpdateOptions"
    />

    <CaregiversForm @saved="handleSaved" />
    <FamiliesFamilyForm ref="familyFormRef" @saved="handleSaved" />
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>