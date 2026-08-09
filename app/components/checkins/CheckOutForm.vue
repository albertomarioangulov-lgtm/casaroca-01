<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { isCheckOutOpen, selectedCheckIn, closeCheckOut, checkOut, error, loading } = useCheckIns()

const wristbandNumber = ref('')
const caregiverSearch = ref('')
const caregiverResults = ref<Array<Record<string, any>>>([])
const searching = ref(false)
const selectedCaregiver = ref<Record<string, any> | null>(null)
const submitError = ref('')
const submitting = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const reset = () => {
  wristbandNumber.value = ''
  caregiverSearch.value = ''
  caregiverResults.value = []
  selectedCaregiver.value = null
  submitError.value = ''
}

watch(isCheckOutOpen, (isOpen) => {
  if (isOpen) {
    // Pre-cargar la manilla del check-in seleccionado
    wristbandNumber.value = selectedCheckIn.value?.wristbandNumber || ''
    reset()
    // Restaurar después del reset
    wristbandNumber.value = selectedCheckIn.value?.wristbandNumber || ''
  }
})

const close = () => {
  closeCheckOut()
}

// ===== Búsqueda de acudiente que recoge =====
watch(caregiverSearch, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!val || val.length < 2) {
    caregiverResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const result = await $fetch('/api/caregivers/search', {
        params: { q: val, limit: 8 },
      }) as any
      caregiverResults.value = result.items || []
    } catch {
      caregiverResults.value = []
    } finally {
      searching.value = false
    }
  }, 400)
})

const selectCaregiver = (caregiver: Record<string, any>) => {
  selectedCaregiver.value = caregiver
  caregiverSearch.value = ''
  caregiverResults.value = []
}

const canSubmit = computed(() => {
  return wristbandNumber.value.trim() && selectedCaregiver.value && !submitting.value
})

const submit = async () => {
  submitError.value = ''

  if (!selectedCaregiver.value) {
    submitError.value = 'Debe seleccionar el acudiente que recoge'
    return
  }

  submitting.value = true
  const success = await checkOut({
    wristbandNumber: wristbandNumber.value.trim(),
    caregiverId: selectedCaregiver.value.id,
  })
  submitting.value = false

  if (success) {
    close()
    emit('saved')
  } else {
    submitError.value = error.value
  }
}
</script>

<template>
  <v-dialog :model-value="isCheckOutOpen" max-width="600" @update:model-value="close">
    <v-card>
      <v-progress-linear :indeterminate="submitting" :model-value="submitting ? undefined : 100" />
      <v-card-title>Registrar salida</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <v-card variant="tonal" class="mb-4 pa-3">
          <div class="text-subtitle-1 font-weight-bold">Niño: {{ selectedCheckIn?.childName }}</div>
          <div class="text-caption text-medium-emphasis">
            Manilla registrada: {{ selectedCheckIn?.wristbandNumber }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Entregado por: {{ selectedCheckIn?.caregiverName }}
          </div>
        </v-card>

        <v-text-field
          v-model="wristbandNumber"
          label="Número de manilla"
          outlined
          required
          hint="Debe coincidir con el número registrado al ingreso"
          persistent-hint
        />

        <h3 class="text-subtitle-1 font-weight-bold mb-2 mt-2">¿Quién recoge al niño?</h3>

        <template v-if="!selectedCaregiver">
          <v-text-field
            v-model="caregiverSearch"
            label="Buscar acudiente por nombre"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            :loading="searching"
          />
          <v-list v-if="caregiverResults.length" density="compact" class="border rounded">
            <v-list-item
              v-for="cg in caregiverResults"
              :key="cg.id"
              :title="cg.name"
              :subtitle="cg.phone || ''"
              @click="selectCaregiver(cg)"
            />
          </v-list>
        </template>
        <div v-else class="d-flex align-center">
          <v-chip color="primary" variant="tonal" class="mr-2">
            {{ selectedCaregiver.name }}
            <template v-if="selectedCaregiver.phone"> · {{ selectedCaregiver.phone }}</template>
          </v-chip>
          <v-btn size="x-small" variant="text" icon="mdi-close" @click="selectedCaregiver = null" />
        </div>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">Cancelar</v-btn>
          <v-btn
            color="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >
            Confirmar salida
          </v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>