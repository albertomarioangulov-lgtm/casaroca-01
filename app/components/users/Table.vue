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

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Correo', key: 'email', sortable: true },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Registrado', key: 'createdAt', sortable: true },
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
    <template #item.roles="{ item }">
      {{ item.roles.length ? item.roles.join(', ') : 'Sin roles' }}
    </template>
    <template #item.createdAt="{ item }">
      {{ new Date(item.createdAt).toLocaleDateString() }}
    </template>
    <template #item.actions="{ item }">
      <UsersBtnEdit :user="item" />
    </template>
    <template #no-data>
      No hay usuarios registrados.
    </template>
    <template #loading>
      Cargando usuarios...
    </template>
  </v-data-table-server>
</template>
