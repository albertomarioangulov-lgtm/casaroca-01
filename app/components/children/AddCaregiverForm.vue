<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  childId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const isOpen = ref(false)
const submitting = ref(false)
const submitError = ref('')

// Modo búsqueda (acudiente existente)
const search = ref('')
const results = ref<Array<Record<string, any>>>([])
const searching = ref(false)
const selectedCaregiver = ref<Record<string, any> | null>(null)

// Modo creación (acudiente nuevo)
const showNewCaregiver = ref(false)
const newCaregiverName = ref('')
const newCaregiverPhone = ref('')

const relationship = ref('')
const relationshipOptions = [
  'Padre', 'Madre', 'Tío', 'Tía', 'Abuelo', 'Abuela',
  'Hermano', 'Hermana', 'Primo', 'Prima', 'Tutor', 'Otro',
]

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const open = () => {
  reset()
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const reset = () => {
  search.value = ''
  results.value = []
  selectedCaregiver.value = null
  showNewCaregiver.value = false
  newCaregiverName.value = ''
  newCaregiverPhone.value = ''
  relationship.value = ''
  submitError.value = ''
}

watch(search, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!val || val.length < 2) {
    results.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const result = await $fetch('/api/caregivers/search', {
        params: { q: val, limit: 8 },
      }) as any
      // Excluir acudientes que ya podrían no estar asociados — se valida en el backend, aquí solo mostramos
      results.value = result.items || []
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 400)
})

const selectCaregiver = (caregiver: Record<string, any>) => {
  selectedCaregiver.value = caregiver
  search.value = ''
  results.value = []
}

const useNewCaregiverMode = () => {
  selectedCaregiver.value = null
  showNewCaregiver.value = true
  search.value = ''
  results.value = []
}

const canSubmit = computed(() => {
  const hasCaregiver = !!selectedCaregiver.value || (showNewCaregiver.value && newCaregiverName.value.trim())
  const hasRelationship = relationship.value.trim()
  return hasCaregiver && hasRelationship && !submitting.value
})

const submit = async () => {
  submitError.value = ''

  const payload: Record<string, any> = {
    relationship: relationship.value.trim(),
  }

  if (selectedCaregiver.value) {
    payload.caregiverId = selectedCaregiver.value.id
  } else {
    payload.name = newCaregiverName.value.trim()
    if (newCaregiverPhone.value.trim()) {
      payload.phone = newCaregiverPhone.value.trim()
    }
  }

  submitting.value = true
  try {
    await $fetch(`/api/children/${props.childId}/caregivers`, {
      method: 'POST',
      body: payload,
    })
    close()
    emit('saved')
  } catch (err: any) {
    submitError.value = err?.data?.statusMessage || err?.message || 'Error al agregar el acudiente'
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <v-dialog :model-value="isOpen" max-width="600" @update:model-value="close">
    <v-card>
      <v-progress-linear :indeterminate="submitting" :model-value="submitting ? undefined : 100" />
      <v-card-title>Agregar acudiente al niño</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <!-- Buscar acudiente existente -->
        <template v-if="!selectedCaregiver && !showNewCaregiver">
          <v-text-field
            v-model="search"
            label="Buscar acudiente por nombre o teléfono"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            :loading="searching"
            hint="Escribe al menos 2 caracteres"
          />
          <v-list v-if="results.length" density="compact" class="border rounded mb-2">
            <v-list-item
              v-for="cg in results"
              :key="cg.id"
              :title="cg.name"
              :subtitle="cg.phone || ''"
              @click="selectCaregiver(cg)"
            >
              <template #append>
                <v-chip size="x-small" color="primary" variant="tonal">
                  {{ cg.children?.length || 0 }} niño(s)
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-account-plus"
            @click="useNewCaregiverMode"
          >
            El acudiente no está registrado — crearlo
          </v-btn>
        </template>

        <!-- Acudiente seleccionado -->
        <div v-else-if="selectedCaregiver" class="d-flex align-center mb-4">
          <v-chip color="primary" variant="tonal" class="mr-2">
            {{ selectedCaregiver.name }}
            <template v-if="selectedCaregiver.phone"> · {{ selectedCaregiver.phone }}</template>
          </v-chip>
          <v-btn size="x-small" variant="text" icon="mdi-close" @click="selectedCaregiver = null" />
        </div>

        <!-- Nuevo acudiente -->
        <v-row v-else-if="showNewCaregiver" dense class="mb-2">
          <v-col cols="12" sm="7">
            <v-text-field
              v-model="newCaregiverName"
              label="Nombre del acudiente *"
              density="compact"
            />
          </v-col>
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="newCaregiverPhone"
              label="Teléfono"
              density="compact"
              type="tel"
            />
          </v-col>
        </v-row>

        <!-- Relación -->
        <v-select
          v-model="relationship"
          :items="relationshipOptions"
          label="Relación con el niño *"
          density="compact"
          outlined
          hint="Ej: Abuela, Tío, Madre..."
          persistent-hint
          class="mt-2"
        />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >
            Agregar acudiente
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>