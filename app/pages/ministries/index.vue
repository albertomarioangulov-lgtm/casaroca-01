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
  code: '',
  description: '',
  eligibilityType: 'age',
  minAge: 0,
  maxAge: 999,
  gender: 'male',
  maritalStatus: 'married',
  icon: 'mdi-church-outline',
  color: 'primary',
})

const fetchItems = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/ministries')
    items.value = data.items
  } catch (e: any) {
    console.error('Error fetching ministries:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchItems)

const openCreate = () => {
  editingId.value = null
  form.value = {
    name: '',
    code: '',
    description: '',
    eligibilityType: 'age',
    minAge: 0,
    maxAge: 999,
    gender: 'male',
    maritalStatus: 'married',
    icon: 'mdi-church-outline',
    color: 'primary',
  }
  dialog.value = true
}

const openEdit = (ministry: Record<string, any>) => {
  editingId.value = ministry.id
  form.value = {
    name: ministry.name ?? '',
    code: ministry.code ?? '',
    description: ministry.description ?? '',
    eligibilityType: ministry.eligibilityType ?? 'none',
    minAge: ministry.minAge ?? 0,
    maxAge: ministry.maxAge ?? 999,
    gender: ministry.gender ?? 'male',
    maritalStatus: ministry.maritalStatus ?? 'married',
    icon: ministry.icon ?? 'mdi-church-outline',
    color: ministry.color ?? 'primary',
  }
  dialog.value = true
}

const save = async () => {
  try {
    if (editingId.value) {
      await $fetch(`/api/ministries/${editingId.value}`, {
        method: 'PUT',
        body: form.value,
      })
    } else {
      await $fetch('/api/ministries', {
        method: 'POST',
        body: form.value,
      })
    }
    dialog.value = false
    await fetchItems()
  } catch (e: any) {
    console.error('Error saving ministry:', e)
  }
}

const remove = async (ministry: Record<string, any>) => {
  if (!confirm(`¿Eliminar el ministerio ${ministry.name}?`)) return
  try {
    await $fetch(`/api/ministries/${ministry.id}`, { method: 'DELETE' })
    await fetchItems()
  } catch (e: any) {
    console.error('Error deleting ministry:', e)
  }
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Ministerios</h2>
          <p class="text-body-2 text-medium-emphasis">Ministerios de la iglesia con elegibilidad configurable</p>
        </div>
        <v-btn
          v-if="can(PERMISSIONS.MINISTRIES_CREATE)"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo Ministerio
        </v-btn>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col
        v-for="m in items"
        :key="m.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          class="h-100"
          :color="m.color || 'primary'"
          variant="tonal"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">{{ m.icon || 'mdi-church-outline' }}</v-icon>
            {{ m.name }}
          </v-card-title>
          <v-card-subtitle class="text-caption">{{ m.code }}</v-card-subtitle>
          <v-card-text>
            <div v-if="m.description" class="text-body-2 mb-2">{{ m.description }}</div>
            <div class="text-caption text-medium-emphasis">
              <span v-if="m.eligibilityType === 'age'">
                Edad: {{ m.minAge }} - {{ m.maxAge }} años
              </span>
              <span v-else-if="m.eligibilityType === 'gender'">
                Género: {{ m.gender === 'male' ? 'Hombres' : 'Mujeres' }}
              </span>
              <span v-else-if="m.eligibilityType === 'marital'">
                Estado civil: {{ m.maritalStatus }}
              </span>
              <span v-else>
                Elegibilidad: {{ m.eligibilityType }}
              </span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-chip size="small" variant="flat" color="primary">
              {{ m.memberCount }} miembros
            </v-chip>
            <v-chip size="small" variant="flat" color="secondary" class="ml-1">
              {{ m.leaderCount }} líderes
            </v-chip>
            <v-spacer />
            <v-btn
              v-if="can(PERMISSIONS.MINISTRIES_UPDATE)"
              size="small"
              variant="text"
              icon="mdi-pencil"
              @click="openEdit(m)"
            />
            <v-btn
              v-if="can(PERMISSIONS.MINISTRIES_DELETE)"
              size="small"
              variant="text"
              icon="mdi-delete"
              @click="remove(m)"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo crear/editar ministerio -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>
          {{ editingId ? 'Editar Ministerio' : 'Nuevo Ministerio' }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field v-model="form.name" label="Nombre" required />
            <v-text-field v-model="form.code" label="Código (ej: rokakids)" required />
            <v-textarea v-model="form.description" label="Descripción" auto-grow rows="2" />
            <v-select
              v-model="form.eligibilityType"
              label="Tipo de elegibilidad"
              :items="[
                { title: 'Por edad', value: 'age' },
                { title: 'Por género', value: 'gender' },
                { title: 'Por estado civil', value: 'marital' },
                { title: 'General', value: 'general' },
                { title: 'Sin elegibilidad', value: 'none' },
              ]"
              item-title="title"
              item-value="value"
            />
            <v-row v-if="form.eligibilityType === 'age'">
              <v-col cols="6">
                <v-text-field v-model.number="form.minAge" label="Edad mínima" type="number" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="form.maxAge" label="Edad máxima" type="number" />
              </v-col>
            </v-row>
            <v-select
              v-if="form.eligibilityType === 'gender'"
              v-model="form.gender"
              label="Género"
              :items="[
                { title: 'Hombres', value: 'male' },
                { title: 'Mujeres', value: 'female' },
              ]"
              item-title="title"
              item-value="value"
            />
            <v-select
              v-if="form.eligibilityType === 'marital'"
              v-model="form.maritalStatus"
              label="Estado civil"
              :items="[
                { title: 'Casados', value: 'married' },
                { title: 'Solteros', value: 'single' },
                { title: 'Divorciados', value: 'divorced' },
                { title: 'Viudos', value: 'widowed' },
              ]"
              item-title="title"
              item-value="value"
            />
            <v-text-field v-model="form.icon" label="Icono (mdi)" />
            <v-text-field v-model="form.color" label="Color (vuetify)" />
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