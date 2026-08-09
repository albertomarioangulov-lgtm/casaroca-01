<script setup lang="ts">
defineProps<{
  items: Array<Record<string, any>>
  loading: boolean
  total: number
  page: number
  itemsPerPage: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  (e: 'edit', caregiver: Record<string, any>): void
  (e: 'view', caregiver: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()

const navigateToView = (caregiver: Record<string, any>) => {
  navigateTo(`/caregivers/${caregiver.id}`)
}

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Teléfono', key: 'phone', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false },
]
</script>

<template>
  <v-data-table-server
    :headers="headers"
    :items="items || []"
    item-key="id"
    :loading="loading"
    :items-length="total"
    :page="page"
    :items-per-page="itemsPerPage"
    :sort-by="[{ key: sortBy, order: sortOrder }]"
    density="comfortable"
    @update:options="emit('update:options', $event)"
  >
    <template #item.phone="{ item }">
      {{ item.phone || '—' }}
    </template>
    <template #item.actions="{ item }">
      <v-btn
        size="small"
        variant="text"
        color="green"
        icon="mdi-eye"
        title="Ver hoja de vida"
        @click="navigateToView(item)"
      />
      <CaregiversBtnEdit :caregiver="item" />
    </template>
    <template #no-data>
      No hay acudientes registrados.
    </template>
    <template #loading>
      Cargando acudientes...
    </template>
  </v-data-table-server>
</template>