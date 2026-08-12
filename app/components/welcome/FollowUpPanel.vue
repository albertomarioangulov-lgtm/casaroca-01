<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  cardId: string
  card: Record<string, any>
}>()

const { can, PERMISSIONS } = usePermissions()

// Estado del panel
const loading = ref(false)
const error = ref('')
const data = ref<Record<string, any> | null>(null)
const contactDialogOpen = ref(false)
const stopDialogOpen = ref(false)
const stopReason = ref('')
const stopping = ref(false)

// Mapeos de etiquetas
const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'Sin iniciar',
    active: 'En proceso',
    no_interested: 'No interesado',
    stopped: 'Detenido',
  }
  return map[status] || status
}

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'orange',
    active: 'green',
    no_interested: 'grey',
    stopped: 'red',
  }
  return map[status] || 'grey'
}

const statusIcon = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'mdi-clock-outline',
    active: 'mdi-check-circle-outline',
    no_interested: 'mdi-cancel',
    stopped: 'mdi-stop-circle-outline',
  }
  return map[status] || 'mdi-help-circle-outline'
}

const resultLabel = (result: string) => {
  const map: Record<string, string> = {
    interested: 'Interesado',
    not_interested: 'No interesado',
    accepted_invitation: 'Aceptó invitación',
    declined_invitation: 'Rechazó invitación',
    no_response: 'Sin respuesta',
  }
  return map[result] || result
}

const resultColor = (result: string) => {
  const map: Record<string, string> = {
    interested: 'green',
    not_interested: 'grey',
    accepted_invitation: 'primary',
    declined_invitation: 'orange',
    no_response: 'blue',
  }
  return map[result] || 'grey'
}

const channelLabel = (channel: string) => {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    phone: 'Teléfono',
    email: 'Email',
    in_person: 'Presencial',
  }
  return map[channel] || channel
}

const channelIcon = (channel: string) => {
  const map: Record<string, string> = {
    whatsapp: 'mdi-whatsapp',
    phone: 'mdi-phone',
    email: 'mdi-email',
    in_person: 'mdi-account',
  }
  return map[channel] || 'mdi-message'
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const canManage = computed(() => can(PERMISSIONS.WELCOME_CARDS_UPDATE))
const canView = computed(() => can(PERMISSIONS.WELCOME_CARDS_READ))

const fetchFollowUp = async () => {
  error.value = ''
  loading.value = true
  try {
    const result = await $fetch(`/api/welcome-cards/${props.cardId}/follow-up`) as any
    data.value = result
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al cargar el seguimiento'
  } finally {
    loading.value = false
  }
}

const onContactSaved = () => {
  fetchFollowUp()
}

const openStopDialog = () => {
  stopReason.value = ''
  stopDialogOpen.value = true
}

const doStop = async () => {
  stopping.value = true
  error.value = ''
  try {
    await $fetch(`/api/welcome-cards/${props.cardId}/follow-up/status`, {
      method: 'PUT',
      body: { status: 'stopped', reason: stopReason.value || undefined },
    })
    stopDialogOpen.value = false
    fetchFollowUp()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al detener el seguimiento'
  } finally {
    stopping.value = false
  }
}

const doResume = async () => {
  error.value = ''
  try {
    await $fetch(`/api/welcome-cards/${props.cardId}/follow-up/status`, {
      method: 'PUT',
      body: { status: 'active' },
    })
    fetchFollowUp()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al reanudar el seguimiento'
  }
}

onMounted(() => {
  if (canView.value) {
    fetchFollowUp()
  }
})
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <span class="text-subtitle-1 font-weight-bold">
        Seguimiento
      </span>
      <v-spacer />
      <template v-if="data">
        <v-chip
          :color="statusColor(data.followUpStatus)"
          variant="tonal"
          size="small"
          :prepend-icon="statusIcon(data.followUpStatus)"
        >
          {{ statusLabel(data.followUpStatus) }}
        </v-chip>
      </template>
    </v-card-title>

    <v-card-text>
      <v-alert v-if="error" type="error" class="mb-3" closable @click:close="error = ''">
        {{ error }}
      </v-alert>

      <v-progress-circular
        v-if="loading && !data"
        indeterminate
        class="d-block mx-auto my-4"
      />

      <template v-else-if="data">
        <!-- Estado detallado -->
        <div v-if="data.followUpStatus === 'no_interested'" class="mb-3">
          <v-alert
            type="warning"
            variant="tonal"
            title="Seguimiento detenido — no interesado"
            :text="data.followUpStoppedAt ? `Detenido el ${formatDate(data.followUpStoppedAt)}` : 'La persona pidió que no la contacten más.'"
          />
        </div>
        <div v-else-if="data.followUpStatus === 'stopped'" class="mb-3">
          <v-alert
            type="error"
            variant="tonal"
            title="Seguimiento detenido manualmente"
            :text="`Detenido el ${formatDate(data.followUpStoppedAt)}${data.followUpStoppedReason ? ` — Motivo: ${data.followUpStoppedReason}` : ''}`"
          />
        </div>

        <!-- Evento de conexión al que fue invitado -->
        <v-alert
          v-if="data.connectionEventId && data.connectionEventName"
          type="info"
          variant="tonal"
          class="mb-3"
        >
          <div class="d-flex align-center flex-wrap ga-2">
            <v-icon color="primary">mdi-calendar-star</v-icon>
            <div>
              <strong>Invitado al evento:</strong>
              <v-btn
                variant="text"
                color="primary"
                size="small"
                class="pa-0"
                @click="navigateTo(`/events/${data.connectionEventId}`)"
              >
                {{ data.connectionEventName }}
              </v-btn>
              <span v-if="data.connectionEventDate" class="text-body-2 text-medium-emphasis">
                ({{ formatDate(data.connectionEventDate) }})
              </span>
            </div>
          </div>
        </v-alert>

        <!-- Acciones -->
        <div v-if="canManage" class="d-flex flex-wrap ga-2 mb-4">
          <v-btn
            color="primary"
            prepend-icon="mdi-phone-plus-outline"
            size="small"
            @click="contactDialogOpen = true"
          >
            Registrar contacto
          </v-btn>
          <v-btn
            v-if="data.followUpStatus === 'stopped' || data.followUpStatus === 'no_interested'"
            variant="tonal"
            color="green"
            prepend-icon="mdi-play"
            size="small"
            @click="doResume"
          >
            Reanudar seguimiento
          </v-btn>
          <v-btn
            v-else
            variant="tonal"
            color="red"
            prepend-icon="mdi-stop"
            size="small"
            @click="openStopDialog"
          >
            Detener seguimiento
          </v-btn>
        </div>

        <!-- Historial de contactos -->
        <div v-if="data.contacts?.length">
          <p class="text-subtitle-2 font-weight-bold mb-2">
            Historial de contactos ({{ data.contacts.length }})
          </p>
          <v-timeline side="end" density="compact">
            <v-timeline-item
              v-for="contact in data.contacts"
              :key="contact.id"
              size="small"
              :color="resultColor(contact.result)"
            >
              <v-card variant="outlined" class="mb-2">
                <v-card-text>
                  <div class="d-flex align-center flex-wrap ga-2">
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ resultLabel(contact.result) }}
                    </v-chip>
                    <v-chip size="small" variant="tonal" :prepend-icon="channelIcon(contact.channel)">
                      {{ channelLabel(contact.channel) }}
                    </v-chip>
                    <span class="text-caption text-medium-emphasis">
                      {{ formatDate(contact.contactDate) }}
                    </span>
                    <v-spacer />
                    <span v-if="contact.createdByName" class="text-caption text-medium-emphasis">
                      por {{ contact.createdByName }}
                    </span>
                  </div>
                  <div v-if="contact.notes" class="text-body-2 mt-2">
                    {{ contact.notes }}
                  </div>
                  <div v-if="contact.connectionEventName" class="d-flex align-center ga-1 mt-2">
                    <v-icon size="small" color="primary">mdi-calendar-star</v-icon>
                    <span class="text-caption">
                      Invitado a:
                      <v-btn
                        variant="text"
                        color="primary"
                        size="x-small"
                        class="pa-0"
                        @click="navigateTo(`/events/${contact.connectionEventId}`)"
                      >
                        {{ contact.connectionEventName }}
                      </v-btn>
                    </span>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Registrado el {{ formatDateTime(contact.createdAt) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </div>
        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mt-2"
          title="Sin contactos registrados"
          text="Registra el primer contacto para iniciar el seguimiento de esta persona."
        />
      </template>
    </v-card-text>

    <WelcomeFollowUpContactDialog
      v-model="contactDialogOpen"
      :card-id="cardId"
      @saved="onContactSaved"
    />

    <!-- Diálogo para detener seguimiento -->
    <v-dialog v-model="stopDialogOpen" max-width="450">
      <v-card>
        <v-card-title class="text-h6">¿Detener el seguimiento?</v-card-title>
        <v-card-text>
          <p class="mb-2">
            La persona dejará de aparecer en el flujo activo de seguimiento.
          </p>
          <v-text-field
            v-model="stopReason"
            label="Motivo (opcional)"
            placeholder="Ej: no asiste más, se mudó, proceso completado..."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="stopDialogOpen = false">Cancelar</v-btn>
          <v-btn color="red" :loading="stopping" @click="doStop">
            Detener seguimiento
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>