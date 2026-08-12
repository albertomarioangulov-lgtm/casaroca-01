<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  eventId: string
  requireWristband?: boolean
  invited: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const { checkInPerson, error } = useCheckIns()
const saving = ref(false)
const submitError = ref('')
const wristbandNumber = ref('')

watch(visible, (open) => {
  if (open) {
    wristbandNumber.value = ''
    submitError.value = ''
  }
})

const save = async () => {
  if (!props.invited?.personId || !props.eventId) return
  if (props.requireWristband && !wristbandNumber.value.trim()) {
    submitError.value = 'Este evento requiere número de manilla'
    return
  }
  saving.value = true
  submitError.value = ''
  const ok = await checkInPerson(
    props.eventId,
    props.invited.personId,
    wristbandNumber.value.trim() || undefined
  )
  saving.value = false
  if (ok) {
    visible.value = false
    emit('saved')
  } else {
    submitError.value = error.value || 'Error al registrar la entrada'
  }
}
</script>

<template>
  <v-dialog v-model="visible" max-width="420">
    <v-card>
      <v-card-title class="text-h6">Registrar entrada de invitado</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-3" closable @click:close="submitError = ''">
          {{ submitError }}
        </v-alert>

        <p class="text-subtitle-1 font-weight-bold mb-2">
          {{ invited?.personName || 'Invitado' }}
        </p>
        <p v-if="invited?.personPhone" class="text-body-2 text-medium-emphasis mb-2">
          {{ invited.personPhone }}
        </p>

        <v-text-field
          v-if="requireWristband"
          v-model="wristbandNumber"
          label="Número de manilla *"
          density="compact"
          autofocus
          required
        />
        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mt-1"
          title="Este evento no requiere manilla"
          text="La entrada se marcará directamente."
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" prepend-icon="mdi-clipboard-arrow-left" @click="save">
          Registrar entrada
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>