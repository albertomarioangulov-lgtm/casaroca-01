<script setup lang="ts">
const props = defineProps<{
  items: Array<Record<string, any>>
  loading: boolean
  total: number
  page: number
  itemsPerPage: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  (e: 'edit', user: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()
</script>

<template>
  <v-data-iterator
    :items="items || []"
    item-key="id"
    :loading="loading"
    :items-length="total"
    :page="page"
    :items-per-page="itemsPerPage"
    :sort-by="[{ key: sortBy, order: sortOrder }]"
    @update:options="emit('update:options', $event)"
  >
    <template #default="{ items: iteratorItems }">
      <v-row class="mt-2">
        <v-col
          v-for="item in iteratorItems"
          :key="item.raw.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            class="user-card h-100"
          >
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
                  <v-icon color="primary">mdi-account</v-icon>
                </v-avatar>
                <div class="flex-grow-1" style="min-width: 0;">
                  <div class="text-body-1 font-weight-bold text-truncate">
                    {{ item.raw.name }}
                  </div>
                  <div class="text-caption text-grey text-truncate">
                    {{ item.raw.email }}
                  </div>
                </div>
              </div>

              <v-divider class="mb-2" />

              <div class="d-flex align-center mb-1">
                <v-icon size="small" color="grey" class="mr-2">mdi-shield-account</v-icon>
                <span class="text-body-2">
                  {{ item.raw.roles?.length ? item.raw.roles.join(', ') : 'Sin roles' }}
                </span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="small" color="grey" class="mr-2">mdi-calendar</v-icon>
                <span class="text-body-2">{{ new Date(item.raw.createdAt).toLocaleDateString() }}</span>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-spacer />
              <UsersBtnEdit :user="item.raw" />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template #no-data>
      <div class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-group-outline</v-icon>
        <h3 class="text-h6 text-grey">No hay usuarios registrados</h3>
      </div>
    </template>

    <template #loader>
      <div class="d-flex justify-center py-12">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>
    </template>
  </v-data-iterator>
</template>

<style scoped>
.user-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>