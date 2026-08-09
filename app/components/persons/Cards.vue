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
  (e: 'update:options', options: any): void
}>()

const openDetail = (person: Record<string, any>) => {
  navigateTo(`/persons/${person.id}`)
}
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
          <v-card class="person-card h-100">
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
                  <span class="text-subtitle-1">{{ item.raw.name?.charAt(0) || '?' }}</span>
                </v-avatar>
                <div class="flex-grow-1" style="min-width: 0;">
                  <div
                    class="text-body-1 font-weight-bold text-truncate cursor-pointer"
                    @click="openDetail(item.raw)"
                  >
                    {{ item.raw.name }}
                  </div>
                  <div class="text-caption text-grey text-truncate">
                    {{ item.raw.email || item.raw.phone || '—' }}
                  </div>
                </div>
              </div>

              <v-divider class="mb-2" />

              <div class="d-flex align-center mb-1">
                <v-icon size="small" color="grey" class="mr-2">mdi-cake-variant</v-icon>
                <span class="text-caption">{{ item.raw.age !== null ? `${item.raw.age} años` : 'Edad n/d' }}</span>
              </div>
              <div class="d-flex align-center mb-1">
                <v-icon size="small" color="grey" class="mr-2">mdi-ring</v-icon>
                <span class="text-caption">{{ item.raw.maritalStatus || '—' }}</span>
              </div>
              <div class="d-flex align-center mb-1">
                <v-icon size="small" color="grey" class="mr-2">mdi-church</v-icon>
                <span class="text-caption">
                  {{ item.raw.ministries?.length ? item.raw.ministries.map((m: any) => m.name).join(', ') : 'Sin ministerios' }}
                </span>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-account-details"
                @click="openDetail(item.raw)"
              >
                Hoja de vida
              </v-btn>
              <v-spacer />
              <PersonsBtnEdit :person="item.raw" />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <template #no-data>
      No hay personas registradas.
    </template>
  </v-data-iterator>
</template>