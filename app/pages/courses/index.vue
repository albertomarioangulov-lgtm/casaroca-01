<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const dialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref<Record<string, any>>({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  ministryId: '',
  status: 'draft',
})

const ministries = ref<Record<string, any>[]>([])

const fetchItems = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/courses')
    items.value = data.items
  } catch (e: any) {
    console.error('Error fetching courses:', e)
  } finally {
    loading.value = false
  }
}

const fetchMinistries = async () => {
  const data = await $fetch('/api/ministries')
  ministries.value = data.items ?? []
}

onMounted(async () => {
  await fetchMinistries()
  await fetchItems()
})

const openCreate = () => {
  editingId.value = null
  form.value = { name: '', description: '', startDate: '', endDate: '', ministryId: '', status: 'draft' }
  dialog.value = true
}

const openDetail = (course: Record<string, any>) => {
  navigateTo(`/courses/${course.id}`)
}

const save = async () => {
  try {
    if (editingId.value) {
      await $fetch(`/api/courses/${editingId.value}`, { method: 'PUT', body: form.value })
    } else {
      await $fetch('/api/courses', { method: 'POST', body: form.value })
    }
    dialog.value = false
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al guardar el curso')
  }
}

const remove = async (course: Record<string, any>) => {
  if (!confirm(`¿Eliminar el curso ${course.name}?`)) return
  try {
    await $fetch(`/api/courses/${course.id}`, { method: 'DELETE' })
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al eliminar el curso')
  }
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { draft: 'Borrador', active: 'Activo', finished: 'Finalizado' }
  return map[status] ?? status
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Cursos de Discipulado</h2>
          <p class="text-body-2 text-medium-emphasis">Cursos, solicitudes de inscripción y asistencia</p>
        </div>
        <v-btn
          v-if="can(PERMISSIONS.COURSES_CREATE)"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo Curso
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="[
          { title: 'Nombre', key: 'name' },
          { title: 'Ministerio', key: 'ministryName' },
          { title: 'Inicio', key: 'startDate' },
          { title: 'Fin', key: 'endDate' },
          { title: 'Sesiones', key: 'sessionCount' },
          { title: 'Aprobados', key: 'approvedCount' },
          { title: 'Pendientes', key: 'pendingCount' },
          { title: 'Estado', key: 'status' },
          { title: 'Acciones', key: 'actions' },
        ]"
        :items="items"
        :loading="loading"
      >
        <template #[`item.startDate`]="{ item }">
          {{ item.startDate ? new Date(item.startDate).toLocaleDateString() : '—' }}
        </template>
        <template #[`item.endDate`]="{ item }">
          {{ item.endDate ? new Date(item.endDate).toLocaleDateString() : '—' }}
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'active' ? 'success' : item.status === 'finished' ? 'info' : 'default'"
            size="small"
            variant="tonal"
          >
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn size="small" variant="text" icon="mdi-eye" @click="openDetail(item)" />
          <v-btn
            v-if="can(PERMISSIONS.COURSES_DELETE)"
            size="small"
            variant="text"
            icon="mdi-delete"
            @click="remove(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo crear curso -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>{{ editingId ? 'Editar Curso' : 'Nuevo Curso' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field v-model="form.name" label="Nombre" required />
            <v-textarea v-model="form.description" label="Descripción" auto-grow rows="2" />
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="form.startDate" label="Fecha de inicio" type="date" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.endDate" label="Fecha de fin" type="date" />
              </v-col>
            </v-row>
            <v-autocomplete
              v-model="form.ministryId"
              label="Ministerio (opcional)"
              :items="ministries"
              item-title="name"
              item-value="id"
              clearable
            />
            <v-select
              v-model="form.status"
              label="Estado"
              :items="[
                { title: 'Borrador', value: 'draft' },
                { title: 'Activo', value: 'active' },
                { title: 'Finalizado', value: 'finished' },
              ]"
              item-title="title"
              item-value="value"
            />
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