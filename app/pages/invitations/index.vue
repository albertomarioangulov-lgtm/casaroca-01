<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

const items = ref<Record<string, any>[]>([])
const loading = ref(false)
const ministers = ref<Record<string, any>[]>([])
const persons = ref<Record<string, any>[]>([])
const events = ref<Record<string, any>[]>([])
const dialog = ref(false)
const form = ref<Record<string, any>>({
  personId: '',
  ministryId: '',
  eventId: '',
  channel: 'in_person',
  message: '',
})

const statusFilter = ref('pending')

const fetchItems = async () => {
  loading.value = true
  try {
    const query: Record<string, any> = {}
    if (statusFilter.value) query.status = statusFilter.value
    const data = await $fetch('/api/invitations', { query })
    items.value = data.items
  } catch (e: any) {
    console.error('Error fetching invitations:', e)
  } finally {
    loading.value = false
  }
}

const fetchSelects = async () => {
  const [ministriesData, personsData, eventsData] = await Promise.all([
    $fetch('/api/ministries'),
    $fetch('/api/persons', { query: { limit: 100 } }),
    $fetch('/api/events', { query: { limit: 50 } }),
  ])
  ministers.value = ministriesData.items ?? []
  persons.value = personsData.items ?? []
  events.value = eventsData.items ?? []
}

onMounted(async () => {
  await fetchSelects()
  await fetchItems()
})

watch(statusFilter, fetchItems)

const openCreate = () => {
  form.value = { personId: '', ministryId: '', eventId: '', channel: 'in_person', message: '' }
  dialog.value = true
}

const save = async () => {
  try {
    await $fetch('/api/invitations', { method: 'POST', body: form.value })
    dialog.value = false
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al crear la invitación')
  }
}

const respond = async (inv: Record<string, any>, status: string) => {
  try {
    await $fetch(`/api/invitations/${inv.id}`, { method: 'PUT', body: { status } })
    await fetchItems()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al responder la invitación')
  }
}

const channelLabel = (channel: string) => {
  const map: Record<string, string> = {
    in_person: 'Presencial',
    whatsapp: 'WhatsApp',
    phone: 'Teléfono',
    email: 'Email',
    portal: 'Portal',
  }
  return map[channel] ?? channel
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    declined: 'Rechazada',
    no_response: 'Sin respuesta',
    cancelled: 'Cancelada',
  }
  return map[status] ?? status
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Invitaciones</h2>
          <p class="text-body-2 text-medium-emphasis">Seguimiento de invitaciones a ministerios</p>
        </div>
        <v-btn
          v-if="can(PERMISSIONS.INVITATIONS_CREATE)"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nueva Invitación
        </v-btn>
      </v-col>
    </v-row>

    <v-card class="mb-4">
      <v-card-text>
        <v-select
          v-model="statusFilter"
          label="Estado"
          density="compact"
          hide-details
          class="max-w-200"
          :items="[
            { title: 'Pendientes', value: 'pending' },
            { title: 'Aceptadas', value: 'accepted' },
            { title: 'Rechazadas', value: 'declined' },
            { title: 'Sin respuesta', value: 'no_response' },
            { title: 'Todas', value: '' },
          ]"
          item-title="title"
          item-value="value"
        />
      </v-card-text>
    </v-card>

    <v-card>
      <v-data-table
        :headers="[
          { title: 'Persona', key: 'personName' },
          { title: 'Ministerio', key: 'ministryName' },
          { title: 'Evento', key: 'eventName' },
          { title: 'Canal', key: 'channel' },
          { title: 'Invitado por', key: 'invitedByName' },
          { title: 'Estado', key: 'status' },
          { title: 'Acciones', key: 'actions' },
        ]"
        :items="items"
        :loading="loading"
      >
        <template #[`item.channel`]="{ item }">
          {{ channelLabel(item.channel) }}
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'accepted' ? 'success' : item.status === 'declined' ? 'error' : item.status === 'pending' ? 'warning' : 'default'"
            size="small"
            variant="tonal"
          >
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <template v-if="item.status === 'pending' && can(PERMISSIONS.INVITATIONS_UPDATE)">
            <v-btn size="small" color="success" variant="tonal" class="mr-1" @click="respond(item, 'accepted')">
              Aceptar
            </v-btn>
            <v-btn size="small" color="error" variant="tonal" class="mr-1" @click="respond(item, 'declined')">
              Rechazar
            </v-btn>
            <v-btn size="small" variant="tonal" @click="respond(item, 'no_response')">
              Sin respuesta
            </v-btn>
          </template>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo crear invitación -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>Nueva Invitación</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-autocomplete
              v-model="form.personId"
              label="Persona a invitar"
              :items="persons"
              item-title="name"
              item-value="id"
              required
            />
            <v-autocomplete
              v-model="form.ministryId"
              label="Ministerio"
              :items="ministers"
              item-title="name"
              item-value="id"
              required
            />
            <v-autocomplete
              v-model="form.eventId"
              label="Evento (opcional)"
              :items="events"
              item-title="name"
              item-value="id"
              clearable
            />
            <v-select
              v-model="form.channel"
              label="Canal"
              :items="[
                { title: 'Presencial', value: 'in_person' },
                { title: 'WhatsApp', value: 'whatsapp' },
                { title: 'Teléfono', value: 'phone' },
                { title: 'Email', value: 'email' },
              ]"
              item-title="title"
              item-value="value"
            />
            <v-textarea v-model="form.message" label="Mensaje" auto-grow rows="2" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="save">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>