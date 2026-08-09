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
  (e: 'edit', event: Record<string, any>): void
  (e: 'view', event: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()

const statusLabels: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programado', color: 'blue' },
  active: { label: 'Activo', color: 'green' },
  finished: { label: 'Finalizado', color: 'grey' },
  cancelled: { label: 'Cancelado', color: 'red' },
}

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Fecha', key: 'date', sortable: true },
  { title: 'Hora', key: 'time', sortable: false },
  { title: 'Estado', key: 'status', sortable: true },
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
    <template #item.date="{ item }">
      {{ new Date(item.date).toLocaleDateString() }}
    </template>
    <template #item.time="{ item }">
      {{ [item.startTime, item.endTime].filter(Boolean).join(' - ') || '—' }}
    </template>
    <template #item.status="{ item }">
      <v-chip
        size="small"
        :color="statusLabels[item.status]?.color || 'grey'"
        variant="tonal"
      >
        {{ statusLabels[item.status]?.label || item.status }}
      </v-chip>
    </template>
    <template #item.actions="{ item }">
      <v-btn
        size="small"
        variant="text"
        color="green"
        icon="mdi-eye"
        title="Ver evento"
        @click="emit('view', item)"
      />
      <EventsBtnEdit :event="item" />
    </template>
    <template #no-data>
      No hay eventos registrados.
    </template>
    <template #loading>
      Cargando eventos...
    </template>
  </v-data-table-server>
</template>