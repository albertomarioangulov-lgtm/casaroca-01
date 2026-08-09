<script setup lang="ts">
defineProps<{
  items: Array<Record<string, any>>
  loading: boolean
  total: number
  page: number
  itemsPerPage: number
}>()

const emit = defineEmits<{
  (e: 'edit', caregiver: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!items?.length" class="text-center py-8 text-medium-emphasis">
      No hay acudientes registrados.
    </div>

    <v-row v-else dense>
      <v-col
        v-for="caregiver in items"
        :key="caregiver.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="mb-2" hover>
          <v-card-item>
            <v-card-title class="text-body-1 font-weight-bold">
              {{ caregiver.name }}
            </v-card-title>
            <v-card-subtitle>
              {{ caregiver.phone || 'Sin teléfono' }}
            </v-card-subtitle>
          </v-card-item>

          <v-card-actions>
            <v-spacer />
            <CaregiversBtnEdit :caregiver="caregiver" />
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