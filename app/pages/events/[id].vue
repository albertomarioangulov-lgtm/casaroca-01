<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const eventId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const {
  checkIns,
  loading,
  error,
  successMessage,
  totalInside,
  totalOut,
  search,
  statusFilter,
  fetchCheckIns,
  openCheckOut,
  reset,
} = useCheckIns()

const eventName = ref('')
const eventMinistryName = ref('')
const welcomeEnabled = ref(true)
const eventLoaded = ref(false)
const eventStatus = ref('')
const activating = ref(false)
const isParentEvent = ref(false)
const parentEventId = ref('')
const parentEventName = ref('')
const parentEventActive = ref(false)
const childEvents = ref<Array<Record<string, any>>>([])
const creatingKids = ref(false)
const kidsError = ref('')
const confirmDialog = ref(false)
const welcomeCards = ref<Array<Record<string, any>>>([])
const welcomeLoading = ref(false)
const checkInFormRef = ref<any>(null)
const checkOutFormRef = ref<any>(null)

const fetchWelcomeCards = async () => {
  welcomeLoading.value = true
  try {
    // Endpoint ligero e indexado: solo los campos de la tabla de este evento
    const data = await $fetch(`/api/events/${eventId}/welcome-cards`) as any
    welcomeCards.value = data?.items ?? []
  } catch {
    welcomeCards.value = []
  } finally {
    welcomeLoading.value = false
  }
}

const motivationSummary = (values: string[] | undefined): string => {
  if (!values || !values.length) return '—'
  const map: Record<string, string> = {
    tv_program: 'Programa TV H&C',
    invitation: 'Invitación',
    magazine: 'Revista H&C',
    social_media: 'Redes Sociales',
    other: 'Otros',
  }
  return values.map((v) => map[v] || v).join(', ')
}

const formatDateShort = (date: string | null | undefined): string => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

const fetchEvent = async () => {
  try {
    const result = await $fetch(`/api/events/${eventId}`) as any
    eventName.value = result.name
    eventMinistryName.value = result.ministryName || ''
    welcomeEnabled.value = result.welcomeEnabled ?? true
    eventStatus.value = result.status || ''
    parentEventId.value = result.parentEventId || ''
    parentEventName.value = result.parentEventName || ''
    parentEventActive.value = result.parentEventActive ?? false
    isParentEvent.value = !result.parentEventId
    childEvents.value = result.childEvents ?? []
    kidsError.value = ''
  } catch {
    eventName.value = ''
    childEvents.value = []
  } finally {
    eventLoaded.value = true
  }
}

// Carga ligera de solo el estado del evento (rápido) para la alerta/chip sin esperar childEvents
const fetchEventStatus = async () => {
  try {
    const result = await $fetch(`/api/events/${eventId}/status`) as any
    if (result) {
      eventStatus.value = result.status ?? ''
      welcomeEnabled.value = result.welcomeEnabled ?? true
      parentEventId.value = result.parentEventId ?? ''
      parentEventName.value = result.parentEventName ?? ''
      parentEventActive.value = result.parentEventActive ?? false
      eventName.value = result.name || eventName.value
      eventMinistryName.value = result.ministryName ?? eventMinistryName.value
      eventLoaded.value = true
    }
  } catch {
    // fallback: si falla, dejamos que fetchEvent lo recupere
  }
}

const goToParentEvent = () => {
  if (parentEventId.value) {
    navigateTo(`/events/${parentEventId.value}`)
  }
}

const isEventActive = computed(() => eventStatus.value === 'active')

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    scheduled: 'programado',
    active: 'activo',
    finished: 'finalizado',
    cancelled: 'cancelado',
  }
  return map[eventStatus.value] || eventStatus.value
})

// Evento principal con hijos en estado 'scheduled' → se pregunta si activarlos también
const hasPendingChildren = computed(() =>
  isParentEvent.value &&
  childEvents.value.some((c: Record<string, any>) => c.status === 'scheduled')
)

const doActivate = async (activateChildren: boolean) => {
  activating.value = true
  error.value = ''
  confirmDialog.value = false
  try {
    const response = await $fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      body: { status: 'active', activateChildren },
    }) as any
    await fetchEvent()
    if (activateChildren && response?.activatedChildren?.length) {
      successMessage.value = `Evento activado junto con: ${response.activatedChildren.join(', ')}.`
    } else {
      successMessage.value = 'Evento activado. Ya puedes registrar asistencia y nuevos.'
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al activar el evento.'
  } finally {
    activating.value = false
  }
}

const activateEvent = () => {
  if (hasPendingChildren.value) {
    confirmDialog.value = true
  } else {
    doActivate(false)
  }
}

const activateOnlyThis = () => {
  doActivate(false)
}

const activateAll = () => {
  doActivate(true)
}

const openWelcomeCard = () => {
  navigateTo(`/welcome/new?eventId=${eventId}`)
}

const createKidsSatellite = async () => {
  creatingKids.value = true
  kidsError.value = ''
  try {
    await $fetch(`/api/events/${eventId}/children`, { method: 'POST' })
    await fetchEvent()
    successMessage.value = 'Servicio de niños creado exitosamente.'
  } catch (err: any) {
    kidsError.value = err?.data?.statusMessage || 'Error al crear el servicio de niños.'
  } finally {
    creatingKids.value = false
  }
}

const handleCheckInSaved = () => {
  fetchCheckIns(eventId)
}

const handleCheckOutSaved = () => {
  fetchCheckIns(eventId)
}

const handleOpenCheckIn = () => {
  checkInFormRef.value?.open()
}

const handleOpenCheckOut = (checkIn: Record<string, any>) => {
  openCheckOut(checkIn)
}

let searchWatchTimeout: ReturnType<typeof setTimeout> | null = null

watch(search, () => {
  if (searchWatchTimeout) clearTimeout(searchWatchTimeout)
  searchWatchTimeout = setTimeout(() => {
    fetchCheckIns(eventId)
  }, 400)
})

watch(statusFilter, () => {
  fetchCheckIns(eventId)
})

onMounted(() => {
  if (can(PERMISSIONS.CHECKINS_READ)) {
    fetchEventStatus()
    fetchEvent()
    fetchCheckIns(eventId)
    if (can(PERMISSIONS.WELCOME_CARDS_READ)) {
      fetchWelcomeCards()
    }
  }
})

onBeforeUnmount(() => {
  reset()
})
</script>

<template>
  <template v-if="can(PERMISSIONS.CHECKINS_READ)">
    <div class="d-flex align-center mb-2">
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-arrow-left"
        class="mr-2"
        @click="navigateTo('/events')"
      >
        Volver a eventos
      </v-btn>
      <v-btn
        v-if="parentEventId"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-arrow-up"
        @click="goToParentEvent"
      >
        Ir al evento padre{{ parentEventName ? `: ${parentEventName}` : '' }}
      </v-btn>
    </div>

    <div class="d-flex align-center mb-2">
      <h2 class="text-h6 font-weight-bold mt-0">
        {{ eventName || 'Evento' }}
      </h2>
      <v-chip
        v-if="eventLoaded && eventStatus"
        size="small"
        :color="isEventActive ? 'green' : 'orange'"
        variant="tonal"
        class="ml-3"
      >
        {{ statusLabel }}
      </v-chip>
      <v-spacer />
      <v-btn
        v-if="!isEventActive && can(PERMISSIONS.EVENTS_UPDATE) && eventStatus === 'scheduled'"
        color="green"
        prepend-icon="mdi-play-circle-outline"
        class="mr-2"
        :loading="activating"
        :disabled="!isParentEvent && !parentEventActive"
        @click="activateEvent"
      >
        Activar evento
      </v-btn>
      <v-btn
        v-if="can(PERMISSIONS.WELCOME_CARDS_CREATE) && welcomeEnabled"
        color="primary"
        prepend-icon="mdi-card-account-details-outline"
        class="mr-2"
        :disabled="!isEventActive"
        @click="openWelcomeCard"
      >
        Registrar nuevo (Tarjeta de Conexión)
      </v-btn>
      <v-btn
        v-if="can(PERMISSIONS.CHECKINS_CREATE)"
        color="primary"
        prepend-icon="mdi-clipboard-arrow-left"
        :disabled="!isEventActive"
        @click="handleOpenCheckIn"
      >
        Registrar entrada
      </v-btn>
    </div>

    <!-- Aviso si el evento no está activo -->
    <v-alert
      v-if="eventLoaded && !isEventActive"
      transition="false"
      type="warning"
      variant="tonal"
      class="mb-4"
      :title="`El evento está ${statusLabel}`"
    >
      <template v-if="eventStatus === 'scheduled' && !isParentEvent && !parentEventActive">
        Primero debes activar el evento principal:
        <v-btn
          variant="text"
          color="primary"
          size="small"
          class="ml-1"
          @click="goToParentEvent"
        >
          {{ parentEventName || 'Ir al evento padre' }}
        </v-btn>
      </template>
      <template v-else-if="eventStatus === 'scheduled'">
        Actívalo para poder registrar asistencia y nuevos.
      </template>
      <template v-else>
        No se puede registrar asistencia ni nuevos en este evento.
      </template>
    </v-alert>

    <!-- Eventos vinculados (satélites de otros ministerios) -->
    <v-card v-if="childEvents.length || isParentEvent" class="mb-4" variant="outlined">
      <v-card-text class="d-flex align-center flex-wrap ga-2">
        <span class="text-body-2 font-weight-bold">Ministerios que atienden en este evento:</span>
        <template v-if="childEvents.length">
          <v-chip
            v-for="child in childEvents"
            :key="child.id"
            :color="child.ministryColor || 'primary'"
            variant="tonal"
            :prepend-icon="child.ministryIcon || 'mdi-church-outline'"
            class="ma-1"
            clickable
            @click="navigateTo(`/events/${child.id}`)"
          >
            {{ child.ministryName || 'Ver' }} ({{ child.checkInCount }})
          </v-chip>
        </template>
        <span v-else class="text-body-2 text-medium-emphasis">
          No hay ministerios vinculados aún.
        </span>
        <v-btn
          v-if="can(PERMISSIONS.EVENTS_CREATE)"
          color="secondary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-baby-carriage"
          class="ml-2"
          :loading="creatingKids"
          @click="createKidsSatellite"
        >
          Crear satélite RocaKids
        </v-btn>
      </v-card-text>
      <v-alert v-if="kidsError" type="error" dense class="mx-4 mb-3" closable @click:close="kidsError = ''">
        {{ kidsError }}
      </v-alert>
    </v-card>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = ''">
      {{ successMessage }}
    </v-alert>

    <div class="d-flex mb-3">
      <v-chip class="mr-2" color="green" variant="tonal">
        Dentro: {{ totalInside }}
      </v-chip>
      <v-chip color="grey" variant="tonal">
        Fuera: {{ totalOut }}
      </v-chip>
    </div>

    <v-toolbar>
      <v-text-field flat class="ml-1"
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar por niño, acudiente o manilla..."
      />
      <v-select
        v-model="statusFilter"
        :items="[
          { title: 'Todos', value: '' },
          { title: 'Dentro', value: 'inside' },
          { title: 'Fuera', value: 'out' },
        ]"
        item-title="title"
        item-value="value"
        label="Estado"
        density="compact"
        variant="outlined"
        class="ml-2"
        style="max-width: 160px;"
      />
    </v-toolbar>

    <v-data-table-server
      :headers="[
        { title: 'Niño', key: 'childName', sortable: false },
        { title: 'Manilla', key: 'wristbandNumber', sortable: false },
        { title: 'Acudiente que entregó', key: 'caregiverName', sortable: false },
        { title: 'Hora ingreso', key: 'checkInTime', sortable: false },
        { title: 'Salida', key: 'checkOutTime', sortable: false },
        { title: 'Acciones', key: 'actions', sortable: false },
      ]"
      :items="checkIns || []"
      item-key="id"
      :loading="loading"
      :items-length="checkIns.length"
      density="comfortable"
      :hide-default-footer="true"
    >
      <template #item.childName="{ item }">
        <div>{{ item.personName }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ item.personBirthDate ? new Date(item.personBirthDate).toLocaleDateString() : '' }}
        </div>
      </template>
      <template #item.checkInTime="{ item }">
        {{ new Date(item.checkInTime).toLocaleTimeString() }}
      </template>
      <template #item.checkOutTime="{ item }">
        <v-chip
          v-if="item.checkOutTime"
          size="small"
          color="grey"
          variant="tonal"
        >
          {{ new Date(item.checkOutTime).toLocaleTimeString() }}
        </v-chip>
        <v-chip
          v-else
          size="small"
          color="green"
          variant="tonal"
        >
          Dentro
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn
          v-if="!item.checkOutTime && can(PERMISSIONS.CHECKINS_UPDATE)"
          size="small"
          variant="text"
          color="orange"
          icon="mdi-clipboard-arrow-right"
          title="Registrar salida"
          @click="handleOpenCheckOut(item)"
        />
      </template>
      <template #no-data>
        <div class="text-center py-6">
          No hay niños registrados en este evento.
        </div>
      </template>
      <template #loading>
        Cargando registros...
      </template>
    </v-data-table-server>

    <!-- Tarjetas de Conexión de este evento -->
    <v-card v-if="can(PERMISSIONS.WELCOME_CARDS_READ)" class="mt-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Tarjetas de Conexión ({{ welcomeCards.length }})
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="[
            { title: 'Fecha', key: 'registrationDate', sortable: true },
            { title: 'Nombre', key: 'name', sortable: true },
            { title: 'Teléfono', key: 'phone', sortable: false },
            { title: 'Email', key: 'email', sortable: false },
            { title: 'Tipología', key: 'visitorType', sortable: true },
            { title: 'Motivación', key: 'motivations', sortable: false },
            { title: 'Acciones', key: 'actions', sortable: false },
          ]"
          :items="welcomeCards"
          item-key="id"
          :loading="welcomeLoading"
          density="compact"
          :items-per-page="8"
        >
          <template #item.registrationDate="{ item }">
            {{ formatDateShort(item.registrationDate) }}
          </template>
          <template #item.visitorType="{ item }">
            <v-chip
              size="small"
              :color="item.visitorType === 'first_time' ? 'blue' : 'orange'"
              variant="tonal"
            >
              {{ item.visitorType === 'first_time' ? 'Primera vez' : 'Actualiza info' }}
            </v-chip>
          </template>
          <template #item.motivations="{ item }">
            {{ motivationSummary(item.motivations) }}
          </template>
          <template #item.actions="{ item }">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye-outline"
              title="Ver tarjeta"
              @click="navigateTo(`/welcome/${item.id}`)"
            />
          </template>
          <template #no-data>
            <div class="text-center py-6">
              No hay tarjetas de conexión para este evento aún.
            </div>
          </template>
          <template #loading>
            Cargando tarjetas...
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <CheckinsCheckInForm ref="checkInFormRef" :event-id="eventId" @saved="handleCheckInSaved" />
    <CheckinsCheckOutForm ref="checkOutFormRef" @saved="handleCheckOutSaved" />

    <!-- Confirmación de activación con ministerios vinculados -->
    <v-dialog v-model="confirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">¿Activar también los ministerios vinculados?</v-card-title>
        <v-card-text>
          <p class="mb-2">
            Este evento tiene ministerios que atienden en paralelo:
          </p>
          <v-chip
            v-for="child in childEvents.filter((c: Record<string, any>) => c.status === 'scheduled')"
            :key="child.id"
            size="small"
            color="primary"
            variant="tonal"
            class="mr-2 mb-2"
          >
            {{ child.ministryName || child.name }}
          </v-chip>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Puedes activar solo este evento, o también activarlos a la vez (recomendado para servicios en paralelo).
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">Cancelar</v-btn>
          <v-btn color="orange" variant="tonal" :loading="activating" @click="activateOnlyThis">
            Solo este evento
          </v-btn>
          <v-btn color="green" :loading="activating" @click="activateAll">
            Activar todos
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>