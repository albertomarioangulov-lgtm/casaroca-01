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

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Edad', key: 'age', sortable: false },
  { title: 'Teléfono', key: 'phone', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Género', key: 'gender', sortable: false },
  { title: 'Estado civil', key: 'maritalStatus', sortable: false },
  { title: 'Ministerios', key: 'ministries', sortable: false },
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
    <template #item.age="{ item }">
      <span v-if="item.age !== null">{{ item.age }} años</span>
      <span v-else>—</span>
    </template>
    <template #item.gender="{ item }">
      <v-chip :color="item.gender === 'male' ? 'blue' : 'pink'" size="small" variant="tonal">
        {{ item.gender === 'male' ? 'Hombre' : item.gender === 'female' ? 'Mujer' : '—' }}
      </v-chip>
    </template>
    <template #item.maritalStatus="{ item }">
      <span>{{ item.maritalStatus || '—' }}</span>
    </template>
    <template #item.ministries="{ item }">
      <template v-if="item.ministries?.length">
        <v-chip
          v-for="m in item.ministries"
          :key="m.id"
          size="small"
          variant="tonal"
          :color="m.color || 'primary'"
          class="mr-1"
        >
          {{ m.name }}
          <span v-if="m.roleInMinistry !== 'member'" class="ml-1 text-caption">
            ({{ m.roleInMinistry === 'director' ? 'Director' : 'Líder' }})
          </span>
        </v-chip>
      </template>
      <span v-else class="text-medium-emphasis">—</span>
    </template>
    <template #item.actions="{ item }">
      <PersonsBtnEdit :person="item" />
    </template>
    <template #no-data>
      No hay personas registradas.
    </template>
    <template #loading>
      Cargando personas...
    </template>
  </v-data-table-server>
</template>