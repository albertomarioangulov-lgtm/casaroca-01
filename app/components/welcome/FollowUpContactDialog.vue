<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  cardId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const saving = ref(false)
const error = ref('')
const connectionEvents = ref<Array<Record<string, any>>>([])
const loadingEvents = ref(false)

const form = ref({
  contactDate: new Date().toISOString().split('T')[0] ?? '',
  channel: 'whatsapp' as string,
  result: 'interested' as string,
  notes: '' as string,
  connectionEventId: '' as string,
})

const resultItems = [
  { title: '🟢 Interesado — quiere seguir en el proceso', value: 'interested' },
  { title: '⚫ No interesado — que no lo contacten más', value: 'not_interested' },
  { title: '🎉 Aceptó invitación al evento de conexión', value: 'accepted_invitation' },
  { title: '🟠 Rechazó invitación', value: 'declined_invitation' },
  { title: '🔵 Sin respuesta — reintentar luego', value: 'no_response' },
]

const channelItems = [
  { title: 'WhatsApp', value: 'whatsapp' },
  { title: 'Teléfono', value: 'phone' },
  { title: 'Email', value: 'email' },
  { title: 'Presencial', value: 'in_person' },
]

const showConnectionEventPicker = computed(() => form.value.result === 'accepted_invitation')

// Cargar eventos de conexión disponibles
const fetchConnectionEvents = async () => {
  loadingEvents.value = true
  try {
    const data = await $fetch('/api/events', {
      query: {
        type: 'welcome',
        status: 'scheduled,active',
        limit: 100,
        sortBy: 'date',
        sortOrder: 'asc',
      },
    }) as any
    connectionEvents.value = data?.items ?? []
  } catch {
    connectionEvents.value = []
  } finally {
    loadingEvents.value = false
  }
}

watch(visible, (open) => {
  if (open) {
    error.value = ''
    form.value = {
      contactDate: new Date().toISOString().split('T')[0] ?? '',
      channel: 'whatsapp',
      result: 'interested',
      notes: '',
      connectionEventId: '',
    }
    fetchConnectionEvents()
  }
})

const save = async () => {
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/welcome-cards/${props.cardId}/follow-up/contacts`, {
      method: 'POST' as any,
      body: {
        contactDate: form.value.contactDate || undefined,
        channel: form.value.channel,
        result: form.value.result,
        notes: form.value.notes || undefined,
        connectionEventId: form.value.connectionEventId || undefined,
      },
    })
    visible.value = false
    emit('saved')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al registrar el contacto'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="visible" max-width="550">
    <v-card>
      <v-card-title class="text-h6">Registrar contacto de seguimiento</v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
          {{ error }}
        </v-alert>

        <v-form @submit.prevent="save">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.contactDate"
                label="Fecha del contacto"
                type="date"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.channel"
                label="Canal"
                :items="channelItems"
                item-title="title"
                item-value="value"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="form.result"
                label="Resultado del contacto"
                :items="resultItems"
                item-title="title"
                item-value="value"
                required
              />
            </v-col>
            <v-col v-if="showConnectionEventPicker" cols="12">
              <v-select
                v-model="form.connectionEventId"
                label="Evento de conexión al que aceptó"
                :items="connectionEvents"
                item-title="name"
                item-value="id"
                :loading="loadingEvents"
                hint="La persona quedará pre-inscrita como invitada a este evento."
                persistent-hint
                required
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Nota"
                placeholder="Ej: dijo que le escriban mañana, respondió el jueves, pidió que no lo llamen más..."
                auto-grow
                rows="3"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="visible = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" prepend-icon="mdi-content-save-outline" @click="save">
          Guardar contacto
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>