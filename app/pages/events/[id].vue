<script setup lang="ts">
import { useDisplay } from 'vuetify'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const eventId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()
const { mobile } = useDisplay()

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
const eventAgeGroups = ref<Array<Record<string, any>>>([])
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
    eventAgeGroups.value = result.ageGroups ?? []
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
      if (result.ageGroups) eventAgeGroups.value = result.ageGroups
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

// Agrupar check-ins por salón/rango de edad. Los salones se pre-crean desde
// los ageGroups configurados en el ministerio (aunque aún no tengan niños),
// y los check-ins con snapshot se asignan a su salón histórico.
const checkInGroups = computed(() => {
  const groups = new Map<string, { name: string; index: number; minAge: number | null; maxAge: number | null; items: any[]; inside: number; out: number }>()
  const ungrouped = { name: 'Sin grupo', index: -1, minAge: null, maxAge: null, items: [] as any[], inside: 0, out: 0 }

  // Pre-crear los salones configurados del ministerio
  ;(eventAgeGroups.value || []).forEach((g: any, i: number) => {
    groups.set(`g${i}`, {
      name: g.name || `Grupo ${i + 1}`,
      index: i,
      minAge: g.minAge ?? null,
      maxAge: g.maxAge ?? null,
      items: [] as any[],
      inside: 0,
      out: 0,
    })
  })

  for (const item of checkIns.value || []) {
    // Usar el snapshot del check-in si existe, si no, calcular índice -1 (sin grupo)
    const hasSnapshot = item.ageGroupIndex !== undefined && item.ageGroupIndex >= 0
    const key = hasSnapshot ? `g${item.ageGroupIndex}` : 'ungrouped'
    const target = key === 'ungrouped' ? ungrouped : (groups.get(key) || {
      name: item.ageGroupName || 'Grupo',
      index: item.ageGroupIndex,
      minAge: item.ageGroupMinAge ?? null,
      maxAge: item.ageGroupMaxAge ?? null,
      items: [] as any[],
      inside: 0,
      out: 0,
    })
    target.items.push(item)
    if (!item.checkOutTime) target.inside++
    else target.out++
    if (key !== 'ungrouped') groups.set(key, target)
  }
  const sorted = Array.from(groups.values()).sort((a, b) => a.index - b.index)
  if (ungrouped.items.length) sorted.push(ungrouped)
  return sorted
})

// Pestaña activa del selector de salones
const activeTab = ref<number>(0)

// ¿Hay una búsqueda activa?
const hasActiveSearch = computed(() => (search.value || '').trim().length > 0)

// Auto-navegar al primer tab con items cuando el tab actual está vacío.
// Esto evita que la tabla salga en blanco (por ejemplo, si los check-ins
// están en "Sin grupo" o en otro salón). Si el tab actual tiene items,
// se respeta la selección del usuario.
watch(checkInGroups, (groups) => {
  const currentGroup = groups[activeTab.value]
  const currentHasItems = !!currentGroup && currentGroup.items.length > 0
  if (currentHasItems) return
  const firstIdx = groups.findIndex((g) => g.items.length > 0)
  if (firstIdx !== -1 && firstIdx !== activeTab.value) {
    activeTab.value = firstIdx
  }
})

// Items visibles según la pestaña/salón seleccionada
const activeGroupItems = computed(() => {
  const groups = checkInGroups.value
  if (groups.length === 0) return checkIns.value || []
  const idx = activeTab.value ?? 0
  const group = groups[Math.min(idx, groups.length - 1)]
  return group ? group.items : []
})

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
    <!-- Navegación superior -->
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-arrow-left"
        size="small"
        @click="navigateTo('/events')"
      >
        Volver a eventos
      </v-btn>
      <v-chip
        v-if="parentEventId"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-arrow-up"
        size="small"
        clickable
        @click="goToParentEvent"
      >
        {{ mobile ? 'Evento padre' : (parentEventName ? `Padre: ${parentEventName}` : 'Evento padre') }}
      </v-chip>
    </div>

    <!-- Header: título + acciones principales -->
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <h2 class="text-h6 font-weight-bold mt-0">
        {{ eventName || 'Evento' }}
      </h2>
      <v-chip
        v-if="eventLoaded && eventStatus"
        size="small"
        :color="isEventActive ? 'green' : 'orange'"
        variant="tonal"
      >
        {{ statusLabel }}
      </v-chip>

      <div class="flex-grow-1 d-none d-sm-flex" />

      <!-- Acciones en escritorio: botones con texto -->
      <template v-if="!mobile">
        <v-btn
          v-if="!isEventActive && can(PERMISSIONS.EVENTS_UPDATE) && eventStatus === 'scheduled'"
          color="green"
          prepend-icon="mdi-play-circle-outline"
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
          :disabled="!isEventActive"
          @click="openWelcomeCard"
        >
          Registrar nuevo
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
      </template>

      <!-- Acciones en móvil: iconos con tooltip -->
      <template v-else>
        <v-tooltip text="Activar evento" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-if="!isEventActive && can(PERMISSIONS.EVENTS_UPDATE) && eventStatus === 'scheduled'"
              v-bind="props"
              color="green"
              icon="mdi-play-circle-outline"
              :loading="activating"
              :disabled="!isParentEvent && !parentEventActive"
              @click="activateEvent"
            />
          </template>
        </v-tooltip>
        <v-tooltip text="Registrar nuevo" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-if="can(PERMISSIONS.WELCOME_CARDS_CREATE) && welcomeEnabled"
              v-bind="props"
              color="primary"
              icon="mdi-card-account-details-outline"
              :disabled="!isEventActive"
              @click="openWelcomeCard"
            />
          </template>
        </v-tooltip>
        <v-tooltip text="Registrar entrada" location="bottom">
          <template #activator="{ props }">
            <v-btn
              v-if="can(PERMISSIONS.CHECKINS_CREATE)"
              v-bind="props"
              color="primary"
              icon="mdi-clipboard-arrow-left"
              :disabled="!isEventActive"
              @click="handleOpenCheckIn"
            />
          </template>
        </v-tooltip>
      </template>
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

    <!-- Toolbar de búsqueda -->
    <v-toolbar>
      <v-text-field
        flat
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="solo"
        hide-details
        clearable
        placeholder="Buscar por niño, acudiente o manilla..."
      />
      <v-select
        v-if="!mobile"
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

    <!-- Filtro por estado en móvil: chips táctiles -->
    <div v-if="mobile" class="d-flex ga-1 mt-2 mb-1">
      <v-chip
        size="small"
        :color="statusFilter === '' ? 'primary' : undefined"
        :variant="statusFilter === '' ? 'tonal' : 'outlined'"
        @click="statusFilter = ''"
      >
        Todos
      </v-chip>
      <v-chip
        size="small"
        :color="statusFilter === 'inside' ? 'green' : undefined"
        :variant="statusFilter === 'inside' ? 'tonal' : 'outlined'"
        @click="statusFilter = 'inside'"
      >
        Dentro
      </v-chip>
      <v-chip
        size="small"
        :color="statusFilter === 'out' ? 'grey' : undefined"
        :variant="statusFilter === 'out' ? 'tonal' : 'outlined'"
        @click="statusFilter = 'out'"
      >
        Fuera
      </v-chip>
    </div>

    <!-- Pestañas de salones / rangos de edad -->
    <v-tabs
      v-if="eventAgeGroups.length > 0 || checkInGroups.length > 1"
      v-model="activeTab"
      color="primary"
      class="mb-2"
      show-arrows
    >
      <v-tab
        v-for="(group, index) in checkInGroups"
        :key="index"
        :value="index"
        :class="{ 'tab-no-matches': hasActiveSearch && group.items.length === 0 }"
      >
        <span>
          {{ group.name }}
          <span v-if="group.minAge !== null && group.maxAge !== null && !mobile" class="ml-1 text-caption text-medium-emphasis">
            ({{ group.minAge }}-{{ group.maxAge }})
          </span>
        </span>
        <template v-if="!mobile">
          <v-chip
            v-if="hasActiveSearch && group.items.length > 0"
            size="x-small"
            color="primary"
            variant="flat"
            class="ml-2"
          >
            {{ group.items.length }}
          </v-chip>
          <v-chip size="x-small" class="ml-2" color="green" variant="tonal">
            {{ group.inside }}
          </v-chip>
          <v-chip size="x-small" class="ml-1" color="grey" variant="tonal">
            {{ group.out }}
          </v-chip>
        </template>
      </v-tab>
    </v-tabs>

    <!-- Resumen del grupo activo en móvil -->
    <div v-if="mobile && checkInGroups.length" class="d-flex ga-2 mb-2 text-caption text-medium-emphasis">
      <span class="font-weight-medium">{{ checkInGroups[Math.min(activeTab ?? 0, checkInGroups.length - 1)]?.name }}</span>
      <v-chip size="x-small" color="green" variant="tonal">
        Dentro: {{ checkInGroups[Math.min(activeTab ?? 0, checkInGroups.length - 1)]?.inside ?? 0 }}
      </v-chip>
      <v-chip size="x-small" color="grey" variant="tonal">
        Fuera: {{ checkInGroups[Math.min(activeTab ?? 0, checkInGroups.length - 1)]?.out ?? 0 }}
      </v-chip>
    </div>

    <v-progress-circular
      v-if="loading && !checkIns.length"
      indeterminate
      color="primary"
      class="d-block mx-auto my-8"
    />

    <!-- ===== Cards de check-ins (móvil) ===== -->
    <div v-if="mobile">
      <v-card
        v-for="item in activeGroupItems || []"
        :key="item.id"
        class="mb-2"
        variant="outlined"
      >
        <v-card-item>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="font-weight-bold text-subtitle-2">{{ item.personName }}</div>
              <div class="text-caption text-medium-emphasis">
                <template v-if="item.personBirthDate">
                  {{ new Date(item.personBirthDate).toLocaleDateString() }}
                </template>
                <template v-if="item.age !== null">
                  <template v-if="item.personBirthDate"> · </template>{{ item.age }} años
                </template>
              </div>
            </div>
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
          </div>
          <v-divider class="my-2" />
          <div class="d-flex flex-wrap ga-2 align-center">
            <v-chip
              size="small"
              variant="tonal"
              prepend-icon="mdi-tag-text-outline"
            >
              {{ item.wristbandNumber || 'Sin manilla' }}
            </v-chip>
            <v-chip
              size="small"
              variant="tonal"
              prepend-icon="mdi-account-outline"
            >
              {{ item.caregiverName || 'Sin acudiente' }}
            </v-chip>
            <v-chip
              size="small"
              variant="tonal"
              prepend-icon="mdi-clock-in"
            >
              {{ new Date(item.checkInTime).toLocaleTimeString() }}
            </v-chip>
            <v-spacer />
            <v-btn
              v-if="!item.checkOutTime && can(PERMISSIONS.CHECKINS_UPDATE)"
              size="small"
              variant="tonal"
              color="orange"
              icon="mdi-clipboard-arrow-right"
              title="Registrar salida"
              @click="handleOpenCheckOut(item)"
            />
          </div>
        </v-card-item>
      </v-card>
      <div v-if="!loading && !activeGroupItems.length" class="text-center py-6 text-medium-emphasis">
        {{ hasActiveSearch ? 'Sin resultados para la búsqueda.' : 'No hay niños registrados en este evento.' }}
      </div>
    </div>

    <!-- ===== Tabla de check-ins (escritorio) ===== -->
    <v-data-table-server
      v-else
      :headers="[
        { title: 'Niño', key: 'childName', sortable: false },
        { title: 'Edad', key: 'age', sortable: false },
        { title: 'Manilla', key: 'wristbandNumber', sortable: false },
        { title: 'Acudiente que entregó', key: 'caregiverName', sortable: false },
        { title: 'Hora ingreso', key: 'checkInTime', sortable: false },
        { title: 'Salida', key: 'checkOutTime', sortable: false },
        { title: 'Acciones', key: 'actions', sortable: false },
      ]"
      :items="activeGroupItems || []"
      item-key="id"
      :loading="loading"
      :items-length="activeGroupItems.length"
      density="comfortable"
      :hide-default-footer="true"
    >
      <template #item.childName="{ item }">
        <div>{{ item.personName }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ item.personBirthDate ? new Date(item.personBirthDate).toLocaleDateString() : '' }}
        </div>
      </template>
      <template #item.age="{ item }">
        {{ item.age !== null ? `${item.age} años` : '—' }}
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
          {{ hasActiveSearch ? 'Sin resultados para la búsqueda.' : 'No hay niños registrados en este evento.' }}
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
        <!-- Cards para móvil -->
        <template v-if="mobile">
          <div v-if="welcomeLoading" class="text-center py-6 text-medium-emphasis">
            Cargando tarjetas...
          </div>
          <template v-else>
            <v-card
              v-for="wc in welcomeCards"
              :key="wc.id"
              class="mb-2"
              variant="outlined"
              @click="navigateTo(`/welcome/${wc.id}`)"
            >
              <v-card-item>
                <div class="d-flex align-center">
                  <div class="flex-grow-1">
                    <div class="font-weight-bold text-subtitle-2">{{ wc.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDateShort(wc.registrationDate) }}
                    </div>
                  </div>
                  <v-chip
                    size="small"
                    :color="wc.visitorType === 'first_time' ? 'blue' : 'orange'"
                    variant="tonal"
                  >
                    {{ wc.visitorType === 'first_time' ? 'Primera vez' : 'Actualiza info' }}
                  </v-chip>
                </div>
                <v-divider class="my-2" />
                <div class="d-flex flex-wrap ga-2 align-center">
                  <v-chip
                    v-if="wc.phone"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-phone"
                  >
                    {{ wc.phone }}
                  </v-chip>
                  <v-chip
                    v-if="wc.email"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-email"
                  >
                    {{ wc.email }}
                  </v-chip>
                  <v-chip
                    v-if="wc.motivations?.length"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-heart-outline"
                  >
                    {{ motivationSummary(wc.motivations) }}
                  </v-chip>
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    icon="mdi-eye-outline"
                    title="Ver tarjeta"
                    @click="navigateTo(`/welcome/${wc.id}`)"
                  />
                </div>
              </v-card-item>
            </v-card>
            <div v-if="!welcomeCards.length" class="text-center py-6">
              No hay tarjetas de conexión para este evento aún.
            </div>
          </template>
        </template>

        <!-- Tabla para escritorio -->
        <v-data-table
          v-else
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
        <v-card-actions :class="mobile ? 'flex-column' : ''">
          <v-btn
            variant="text"
            :class="mobile ? 'w-100' : ''"
            @click="confirmDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="orange"
            variant="tonal"
            :loading="activating"
            :class="mobile ? 'w-100' : ''"
            @click="activateOnlyThis"
          >
            Solo este evento
          </v-btn>
          <v-btn
            color="green"
            :loading="activating"
            :class="mobile ? 'w-100' : ''"
            @click="activateAll"
          >
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

<style scoped>
/* Atenuar los tabs sin coincidencias mientras hay una búsqueda activa */
.tab-no-matches {
  opacity: 0.4;
}
</style>