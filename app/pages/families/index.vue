<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const dialog = ref(false)
const form = ref<Record<string, any>>({
  name: '',
  members: [{ name: '', roleInFamily: '' }],
})

const fetchItems = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/families')
    items.value = data.items
  } catch (e: any) {
    console.error('Error fetching families:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchItems)

const openCreate = () => {
  form.value = { name: '', members: [{ name: '', roleInFamily: '' }] }
  dialog.value = true
}

const save = async () => {
  try {
    await $fetch('/api/families', { method: 'POST', body: form.value })
    dialog.value = false
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al guardar la familia')
  }
}

const openDetail = (family: Record<string, any>) => {
  navigateTo(`/families/${family.id}`)
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Familias</h2>
          <p class="text-body-2 text-medium-emphasis">Grupos familiares de la iglesia</p>
        </div>
        <v-btn
          v-if="can(PERMISSIONS.FAMILIES_CREATE)"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nueva Familia
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="[
          { title: 'Nombre', key: 'name' },
          { title: 'Miembros', key: 'members' },
          { title: 'Acciones', key: 'actions' },
        ]"
        :items="items"
        :loading="loading"
      >
        <template #[`item.members`]="{ item }">
          <v-chip
            v-for="m in item.members"
            :key="m.personId"
            size="small"
            variant="tonal"
            class="mr-1"
          >
            {{ m.name }} ({{ m.roleInFamily }})
          </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn size="small" variant="text" icon="mdi-eye" @click="openDetail(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo crear familia -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>Nueva Familia</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field v-model="form.name" label="Nombre de la familia" required />
            <v-divider class="my-2" />
            <p class="text-caption text-medium-emphasis mb-2">Agregar miembros (por ahora se crean nuevos)</p>
            <v-row
              v-for="(member, index) in form.members"
              :key="index"
              class="align-center mb-2"
            >
              <v-col cols="6">
                <v-text-field v-model="member.name" label="Nombre" density="compact" hide-details />
              </v-col>
              <v-col cols="5">
                <v-text-field v-model="member.roleInFamily" label="Rol (ej: padre)" density="compact" hide-details />
              </v-col>
              <v-col cols="1">
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-close"
                  @click="form.members.splice(index, 1)"
                />
              </v-col>
            </v-row>
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-plus"
              @click="form.members.push({ name: '', roleInFamily: '' })"
            >
              Agregar miembro
            </v-btn>
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