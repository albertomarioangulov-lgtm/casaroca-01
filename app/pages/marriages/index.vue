<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const dialog = ref(false)
const form = ref<Record<string, any>>({
  spouse1Id: '',
  spouse2Id: '',
  marriageDate: '',
})

const persons = ref<Record<string, any>[]>([])

const fetchItems = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/marriages')
    items.value = data.items
  } catch (e: any) {
    console.error('Error fetching marriages:', e)
  } finally {
    loading.value = false
  }
}

const fetchPersons = async () => {
  const data = await $fetch('/api/persons', { query: { limit: 100, maritalStatus: '' } })
  persons.value = data.items ?? []
}

onMounted(async () => {
  await fetchPersons()
  await fetchItems()
})

const openCreate = () => {
  form.value = { spouse1Id: '', spouse2Id: '', marriageDate: '' }
  dialog.value = true
}

const save = async () => {
  try {
    await $fetch('/api/marriages', { method: 'POST', body: form.value })
    dialog.value = false
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al guardar el matrimonio')
  }
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { active: 'Activo', divorced: 'Divorciado', widowed: 'Viudo' }
  return map[status] ?? status
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Matrimonios</h2>
          <p class="text-body-2 text-medium-emphasis">Relaciones matrimoniales de la iglesia</p>
        </div>
        <v-btn
          v-if="can(PERMISSIONS.MARRIAGES_CREATE)"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo Matrimonio
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="[
          { title: 'Cónyuge 1', key: 'spouse1' },
          { title: 'Cónyuge 2', key: 'spouse2' },
          { title: 'Fecha', key: 'marriageDate' },
          { title: 'Estado', key: 'status' },
        ]"
        :items="items"
        :loading="loading"
      >
        <template #[`item.spouse1`]="{ item }">{{ item.spouse1.name }}</template>
        <template #[`item.spouse2`]="{ item }">{{ item.spouse2.name }}</template>
        <template #[`item.marriageDate`]="{ item }">
          {{ item.marriageDate ? new Date(item.marriageDate).toLocaleDateString() : '—' }}
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'active' ? 'success' : 'default'"
            size="small"
            variant="tonal"
          >
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo crear matrimonio -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>Nuevo Matrimonio</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-autocomplete
              v-model="form.spouse1Id"
              label="Cónyuge 1"
              :items="persons"
              item-title="name"
              item-value="id"
              required
            />
            <v-autocomplete
              v-model="form.spouse2Id"
              label="Cónyuge 2"
              :items="persons"
              item-title="name"
              item-value="id"
              required
            />
            <v-text-field v-model="form.marriageDate" label="Fecha del matrimonio" type="date" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>