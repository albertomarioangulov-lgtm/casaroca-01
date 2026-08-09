<script setup lang="ts">
defineProps<{
  items: Array<Record<string, any>>
  loading: boolean
  total: number
  page: number
  itemsPerPage: number
}>()

const emit = defineEmits<{
  (e: 'edit', child: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!items?.length" class="text-center py-8 text-medium-emphasis">
      No hay niños registrados.
    </div>

    <v-row v-else dense>
      <v-col
        v-for="child in items"
        :key="child.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="mb-2" hover>
          <v-card-item>
            <v-card-title class="text-body-1 font-weight-bold">
              {{ child.name }}
            </v-card-title>
            <v-card-subtitle>
              <template v-if="child.birthDate">
                {{ new Date(child.birthDate).toLocaleDateString() }}
              </template>
              <template v-else>
                Sin fecha de nacimiento
              </template>
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pt-0 text-caption">
            <div v-if="child.caregivers?.length">
              <div v-for="cg in child.caregivers" :key="cg.id" class="mt-1">
                {{ cg.name }} <template v-if="cg.relationship">({{ cg.relationship }})</template>
              </div>
            </div>
            <div v-else class="text-medium-emphasis">Sin acudientes</div>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <ChildrenBtnEdit :child="child" />
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