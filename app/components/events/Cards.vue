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
</script>

<template>
  <div>
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!items?.length" class="text-center py-8 text-medium-emphasis">
      No hay eventos registrados.
    </div>

    <v-row v-else dense>
      <v-col
        v-for="event in items"
        :key="event.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="mb-2" hover>
          <v-card-item>
            <v-card-title class="text-body-1 font-weight-bold">
              {{ event.name }}
            </v-card-title>
            <v-card-subtitle>
              {{ new Date(event.date).toLocaleDateString() }}
              <template v-if="event.startTime || event.endTime">
                · {{ [event.startTime, event.endTime].filter(Boolean).join(' - ') }}
              </template>
            </v-card-subtitle>
          </v-card-item>

          <v-card-actions>
            <v-chip
              size="x-small"
              :color="statusLabels[event.status]?.color || 'grey'"
              variant="tonal"
            >
              {{ statusLabels[event.status]?.label || event.status }}
            </v-chip>
            <v-spacer />
            <v-btn
              size="small"
              variant="text"
              color="green"
              icon="mdi-eye"
              title="Ver evento"
              @click="emit('view', event)"
            />
            <EventsBtnEdit :event="event" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div class="d-flex justify-center mt-4">
      <v-pagination
        :model-value="page"
        :length="Math.ceil(total / itemsPerPage)"
        :total-visible="5"
        density="compact"
        @update:model-value="emit('update:options', { page: $event, itemsPerPage })"
      />
    </div>
  </div>
</template>