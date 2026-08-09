<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const {
  cards,
  loading,
  error,
  search,
  visitorType,
  total,
  page,
  itemsPerPage,
  sortBy,
  sortOrder,
  fetchCards,
  handleUpdateOptions,
  deleteCard,
} = useWelcomeCards()

const deleteDialog = ref(false)
const deleteConfirm = ref<string | null>(null)

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

const viewCard = (card: Record<string, any>) => {
  navigateTo(`/welcome/${card.id}`)
}

const confirmDelete = (card: Record<string, any>) => {
  deleteConfirm.value = card.id
  deleteDialog.value = true
}

const doDelete = async () => {
  if (!deleteConfirm.value) return
  const ok = await deleteCard(deleteConfirm.value)
  if (ok) {
    deleteConfirm.value = null
    deleteDialog.value = false
  }
}

onMounted(() => {
  if (can(PERMISSIONS.WELCOME_CARDS_READ)) {
    fetchCards()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.WELCOME_CARDS_READ)">
    <div class="d-flex align-center mb-2">
      <h2 class="text-h6 font-weight-bold mt-0">
        Tarjetas de Conexión
      </h2>
      <v-spacer />
      <v-btn
        v-if="can(PERMISSIONS.WELCOME_CARDS_CREATE)"
        color="primary"
        prepend-icon="mdi-plus"
        @click="navigateTo('/welcome/new')"
      >
        Nueva Tarjeta
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Ministerio de Bienvenida — registro de personas nuevas y actualización de información
    </p>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-toolbar>
      <v-text-field
        v-model="search"
        flat
        class="ml-1"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar por nombre, teléfono o email..."
      />
      <v-select
        v-model="visitorType"
        :items="[
          { title: 'Todas', value: '' },
          { title: 'Primera vez', value: 'first_time' },
          { title: 'Actualizar info', value: 'update_info' },
        ]"
        item-title="title"
        item-value="value"
        label="Tipo"
        density="compact"
        variant="outlined"
        class="ml-2"
        style="max-width: 180px;"
      />
    </v-toolbar>

    <v-data-table-server
      :headers="[
        { title: 'Fecha', key: 'registrationDate', sortable: true },
        { title: 'Nombre', key: 'name', sortable: true },
        { title: 'Teléfono', key: 'phone', sortable: false },
        { title: 'Email', key: 'email', sortable: false },
        { title: 'Tipo', key: 'visitorType', sortable: true },
        { title: 'Sede', key: 'campus', sortable: false },
        { title: 'Evento', key: 'eventName', sortable: false },
        { title: 'Acciones', key: 'actions', sortable: false },
      ]"
      :items="cards"
      item-key="id"
      :loading="loading"
      :items-length="total"
      :page="page"
      :items-per-page="itemsPerPage"
      :sort-by="[{ key: sortBy, order: sortOrder }]"
      density="compact"
      @update:options="handleUpdateOptions"
    >
      <template #item.registrationDate="{ item }">
        {{ formatDate(item.registrationDate) }}
      </template>
      <template #item.visitorType="{ item }">
        <v-chip
          size="small"
          :color="item.visitorType === 'first_time' ? 'blue' : 'orange'"
          variant="tonal"
        >
          {{ item.visitorType === 'first_time' ? 'Primera vez' : 'Actualizar info' }}
        </v-chip>
      </template>
      <template #item.campus="{ item }">
        {{ item.campus || '—' }}
      </template>
      <template #item.eventName="{ item }">
        {{ item.eventName || '—' }}
      </template>
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          variant="text"
          color="primary"
          icon="mdi-eye-outline"
          title="Ver"
          @click="viewCard(item)"
        />
        <v-btn
          v-if="can(PERMISSIONS.WELCOME_CARDS_UPDATE)"
          size="small"
          variant="text"
          color="orange"
          icon="mdi-pencil-outline"
          title="Editar"
          @click="navigateTo(`/welcome/${item.id}?edit=1`)"
        />
        <v-btn
          v-if="can(PERMISSIONS.WELCOME_CARDS_DELETE)"
          size="small"
          variant="text"
          color="red"
          icon="mdi-delete-outline"
          title="Eliminar"
          @click="confirmDelete(item)"
        />
      </template>
      <template #no-data>
        <div class="text-center py-6">
          No hay tarjetas de conexión registradas.
        </div>
      </template>
      <template #loading>
        Cargando tarjetas...
      </template>
    </v-data-table-server>

    <!-- Confirmación de eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">¿Eliminar esta tarjeta?</v-card-title>
        <v-card-text>
          Esta acción eliminará la tarjeta de conexión de forma permanente.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="red" @click="doDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>