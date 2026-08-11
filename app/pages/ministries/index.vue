<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const dialog = ref(false)
const editingId = ref<string | null>(null)
const saveError = ref('')
const form = ref<Record<string, any>>({
  name: '',
  code: '',
  description: '',
  eligibilityType: 'age',
  minAge: 0,
  maxAge: 999,
  ageGroups: [] as Array<Record<string, any>>,
  gender: 'male',
  maritalStatus: 'married',
  icon: 'mdi-church-outline',
  color: 'primary',
})

const defaultAgeGroups = () => [
  { name: 'Bebés', minAge: 0, maxAge: 2 },
  { name: 'Párvulos', minAge: 3, maxAge: 4 },
  { name: 'Primaria', minAge: 5, maxAge: 7 },
  { name: 'Pre-adolescentes', minAge: 8, maxAge: 10 },
]

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
  saveError.value = ''
  form.value = {
    name: '',
    code: '',
    description: '',
    eligibilityType: 'age',
    minAge: 0,
    maxAge: 999,
    ageGroups: defaultAgeGroups(),
    gender: 'male',
    maritalStatus: 'married',
    icon: 'mdi-church-outline',
    color: 'primary',
  }
  dialog.value = true
}

const openEdit = (ministry: Record<string, any>) => {
  editingId.value = ministry.id
  saveError.value = ''
  form.value = {
    name: ministry.name ?? '',
    code: ministry.code ?? '',
    description: ministry.description ?? '',
    eligibilityType: ministry.eligibilityType ?? 'none',
    minAge: ministry.minAge ?? 0,
    maxAge: ministry.maxAge ?? 999,
    ageGroups: (ministry.ageGroups?.length ? ministry.ageGroups : defaultAgeGroups()),
    gender: ministry.gender ?? 'male',
    maritalStatus: ministry.maritalStatus ?? 'married',
    icon: ministry.icon ?? 'mdi-church-outline',
    color: ministry.color ?? 'primary',
  }
  dialog.value = true
}

// Agregar un rango de edad vacío al arreglo
const addAgeGroup = () => {
  form.value.ageGroups.push({ name: '', minAge: 0, maxAge: 0 })
}

// Quitar un rango de edad
const removeAgeGroup = (index: number) => {
  form.value.ageGroups.splice(index, 1)
}

// Validar localmente los rangos antes de enviar
const validateAgeGroups = (): string => {
  // Validación individual de cada salón
  for (let i = 0; i < form.value.ageGroups.length; i++) {
    const g = form.value.ageGroups[i]
    if (!g.name || !g.name.trim()) {
      return `El salón #${i + 1} no tiene nombre. Escribe el nombre del salón para ese rango de edad.`
    }
    if (g.maxAge <= g.minAge) {
      return `El salón "${g.name}" necesita un rango válido (mínimo menor que máximo).`
    }
    if (g.minAge < form.value.minAge || g.maxAge > form.value.maxAge) {
      return `El salón "${g.name}" (${g.minAge}-${g.maxAge}) está fuera del rango principal del ministerio (${form.value.minAge}-${form.value.maxAge}).`
    }
  }

  // Validación de cruces entre salones (ningún rango puede compartir edades)
  const sorted = [...form.value.ageGroups].sort((a, b) => a.minAge - b.minAge)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (curr.minAge <= prev.maxAge) {
      return `Los salones "${prev.name}" (${prev.minAge}-${prev.maxAge}) y "${curr.name}" (${curr.minAge}-${curr.maxAge}) comparten edades. No deben cruzarse.`
    }
  }
  return ''
}

const save = async () => {
  saveError.value = ''
  const localError = validateAgeGroups()
  if (localError) {
    saveError.value = localError
    return
  }
  // Ordenar los salones por edad mínima antes de guardar
  form.value.ageGroups.sort((a: any, b: any) => a.minAge - b.minAge)
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
    // Mostrar el mensaje del backend (ej. "El nombre del grupo es requerido")
    const serverMsg = e?.data?.statusMessage || e?.message || 'Error al guardar el ministerio.'
    saveError.value = serverMsg
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
            <div v-if="m.ageGroups?.length" class="mt-2">
              <div class="text-caption font-weight-bold mb-1">Salones:</div>
              <v-chip
                v-for="(g, gi) in m.ageGroups"
                :key="gi"
                size="x-small"
                variant="tonal"
                color="primary"
                class="mr-1 mb-1"
              >
                {{ g.name }} ({{ g.minAge }}-{{ g.maxAge }})
              </v-chip>
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
          <v-alert v-if="saveError" type="error" class="mb-4" closable @click:close="saveError = ''">
            {{ saveError }}
          </v-alert>
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

            <!-- Salones / rangos de edad configurables (ej. RocaKids) -->
            <div v-if="form.eligibilityType === 'age'" class="mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-2 font-weight-bold">Salones por rango de edad</span>
                <v-spacer />
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="addAgeGroup">
                  Agregar rango
                </v-btn>
              </div>
              <v-row
                v-for="(group, index) in form.ageGroups"
                :key="index"
                align="center"
                no-gutters
                class="mb-1"
              >
                <v-col cols="5">
                  <v-text-field
                    v-model="group.name"
                    label="Nombre del salón *"
                    dense
                    :rules="[(v: string | undefined) => (v && v.trim() ? true : 'El nombre del salón es requerido')]"
                  />
                </v-col>
                <v-col cols="3" class="px-1">
                  <v-text-field
                    v-model.number="group.minAge"
                    label="Min"
                    type="number"
                    dense
                    :rules="[
                      (v: string | undefined) => (v !== undefined && v !== '' ? true : 'Requerido'),
                      (v: string | undefined) => (v === undefined || v === '' || Number(v) >= Number(form.minAge) ? true : 'No puede ser menor que la edad mínima del ministerio'),
                    ]"
                  />
                </v-col>
                <v-col cols="3" class="px-1">
                  <v-text-field
                    v-model.number="group.maxAge"
                    label="Max"
                    type="number"
                    dense
                    :rules="[
                      (v: string | undefined) => (v !== undefined && v !== '' ? true : 'Requerido'),
                      (v: string | undefined) => (v === undefined || v === '' || Number(v) > Number(group.minAge) ? true : 'Debe ser mayor que el mínimo'),
                      (v: string | undefined) => (v === undefined || v === '' || Number(v) <= Number(form.maxAge) ? true : 'No puede exceder la edad máxima del ministerio'),
                    ]"
                  />
                </v-col>
                <v-col cols="1" class="text-center">
                  <v-btn size="small" variant="text" icon="mdi-delete" color="error" @click="removeAgeGroup(Number(index))" />
                </v-col>
              </v-row>
              <p class="text-caption text-medium-emphasis mb-0">
                Los niños se asignan automáticamente al salón según su edad al hacer check-in.
              </p>
            </div>
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