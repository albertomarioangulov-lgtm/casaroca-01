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
  (e: 'edit', child: Record<string, any>): void
  (e: 'update:options', options: any): void
}>()

const navigateToView = (child: Record<string, any>) => {
  navigateTo(`/children/${child.id}`)
}

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Fecha nacimiento', key: 'birthDate', sortable: true },
  { title: 'Edad', key: 'age', sortable: false },
  { title: 'Acudientes', key: 'caregivers', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const calculateAge = (birthDate: string | null): string => {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  if (age < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return `${months} meses`
  }
  if (age < 3) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return `${months} meses (${age} año${age > 1 ? 's' : ''})`
  }
  return `${age} años`
}
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
    <template #item.birthDate="{ item }">
      {{ item.birthDate ? new Date(item.birthDate).toLocaleDateString() : '—' }}
    </template>
    <template #item.age="{ item }">
      {{ calculateAge(item.birthDate) }}
    </template>
    <template #item.caregivers="{ item }">
      <div v-if="item.caregivers?.length">
        <v-chip
          v-for="cg in item.caregivers.slice(0, 2)"
          :key="cg.id"
          size="x-small"
          class="mr-1"
          variant="tonal"
        >
          {{ cg.name }} <template v-if="cg.relationship">({{ cg.relationship }})</template>
        </v-chip>
        <span v-if="item.caregivers.length > 2">+{{ item.caregivers.length - 2 }}</span>
      </div>
      <span v-else class="text-medium-emphasis">Sin acudientes</span>
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
      <ChildrenBtnEdit :child="item" />
    </template>
    <template #no-data>
      No hay niños registrados.
    </template>
    <template #loading>
      Cargando niños...
    </template>
  </v-data-table-server>
</template>