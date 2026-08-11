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
const authorizedPeople = ref<Array<Record<string, any>>>([])

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const reset = () => {
  wristbandNumber.value = ''
  caregiverSearch.value = ''
  caregiverResults.value = []
  selectedCaregiver.value = null
  authorizedPeople.value = []
  submitError.value = ''
}

watch(isCheckOutOpen, (isOpen) => {
  if (isOpen) {
    // Pre-cargar la manilla del check-in seleccionado
    wristbandNumber.value = selectedCheckIn.value?.wristbandNumber || ''
    reset()
    // Restaurar después del reset
    wristbandNumber.value = selectedCheckIn.value?.wristbandNumber || ''

    // Construir la lista de autorizados: quien entregó (caregiver) + allowedPickups
    const people: Array<Record<string, any>> = []
    const seen = new Set<string>()

    // 1) Quien entregó (siempre autorizado)
    const caregiverId = selectedCheckIn.value?.caregiverId
    if (caregiverId) {
      people.push({
        id: caregiverId,
        name: selectedCheckIn.value?.caregiverName || 'Quien entregó',
        phone: selectedCheckIn.value?.caregiverPhone || '',
        isCaregiver: true,
      })
      seen.add(caregiverId)
    }

    // 2) Autorizados adicionales del check-in
    for (const ap of (selectedCheckIn.value?.allowedPickups || [])) {
      if (!ap?.id || seen.has(ap.id)) continue
      seen.add(ap.id)
      people.push({
        id: ap.id,
        name: ap.name || '',
        phone: ap.phone || '',
        isCaregiver: false,
      })
    }

    authorizedPeople.value = people

    // Preseleccionar al caregiver (quien entregó) por defecto
    if (caregiverId) {
      selectedCaregiver.value = {
        id: caregiverId,
        name: selectedCheckIn.value?.caregiverName || 'Quien entregó',
        phone: selectedCheckIn.value?.caregiverPhone || '',
      }
      caregiverSearch.value = ''
      caregiverResults.value = []
    }
  }
})

const selectAuthorized = (person: Record<string, any>) => {
  selectedCaregiver.value = { id: person.id, name: person.name, phone: person.phone || '' }
  caregiverSearch.value = ''
  caregiverResults.value = []
}

const isCaregiverSelected = (id: string) => selectedCaregiver.value?.id === id

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
      const result = await $fetch('/api/persons', {
        params: { search: val, limit: 8 },
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

        <!-- Personas autorizadas a recoger (del check-in) -->
        <template v-if="authorizedPeople.length">
          <p class="text-caption text-medium-emphasis mb-1">
            Autorizados a recoger — toca para seleccionar:
          </p>
          <div class="mb-3">
            <v-chip
              v-for="person in authorizedPeople"
              :key="person.id"
              class="mr-1 mb-1"
              :color="isCaregiverSelected(person.id) ? 'green' : (person.isCaregiver ? 'green' : 'primary')"
              :variant="isCaregiverSelected(person.id) ? 'tonal' : 'outlined'"
              :prepend-icon="isCaregiverSelected(person.id) ? 'mdi-check' : 'mdi-account-outline'"
              @click="selectAuthorized(person)"
            >
              {{ person.name }}
              <template v-if="person.phone"> · {{ person.phone }}</template>
              <template v-if="person.isCaregiver">
                <span class="ml-1 text-caption">· quien entregó</span>
              </template>
            </v-chip>
          </div>
        </template>
        <template v-else>
          <p class="text-caption text-medium-emphasis mb-2">
            Sin autorizados registrados — busca a la persona que recoge:
          </p>
        </template>

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