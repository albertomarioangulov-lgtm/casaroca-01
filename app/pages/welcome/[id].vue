<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const cardId = route.params.id as string
// Reactivo al query: cambiar ?edit=1 en la misma ruta reutiliza el componente,
// por lo que debe ser un computed para actualizar la vista sin recargar.
const isEditing = computed(() => route.query.edit === '1')

const { can, PERMISSIONS } = usePermissions()

const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)
const saveError = ref('')
const card = ref<Record<string, any> | null>(null)

const fetchCard = async () => {
  loading.value = true
  try {
    const data = await $fetch(`/api/welcome-cards/${cardId}`) as any
    card.value = data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchCard)

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

const motivationLabel = (values: string[] | undefined) => {
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

const affinityLabel = (value: string | undefined) => {
  const map: Record<string, string> = {
    anios_dorados: 'Años Dorados',
    casa2: 'Casa2',
    hombres_de_bien: 'Hombres de Bien',
    j25: 'J25',
    mujer_integral: 'Mujer Integral',
    tmt: 'tMt',
  }
  return value ? (map[value] || value) : '—'
}

// ==== Re-vinculación de persona en edición ====
// Modos: keep (mantener actual), existing (vincular persona existente),
//        new (crear y vincular persona nueva), unlink (desvincular)
const personLinkMode = ref<'keep' | 'existing' | 'new' | 'unlink'>('keep')
const selectedPersonId = ref('')
const newPersonName = ref('')
const newPersonEmail = ref('')
const newPersonPhone = ref('')

// Búsqueda de personas para el autocomplete
const personSearch = ref('')
const searchResults = ref<Array<Record<string, any>>>([])
const searchLoading = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const searchPersons = async (query: string) => {
  if (!query || query.trim().length < 3) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  try {
    const data = await $fetch('/api/persons', {
      query: { search: query, limit: 8 },
    }) as any
    searchResults.value = data?.items ?? []
  } catch {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

const onPersonSearch = (query: string) => {
  personSearch.value = query
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => searchPersons(query), 400)
}

const saveEdits = async () => {
  if (!card.value) return
  saving.value = true
  saveError.value = ''
  try {
    // Construir payload limpio (quitar campos derivados que el backend no acepta)
    const payload: Record<string, any> = { ...card.value }
    delete payload.id
    delete payload.personName
    delete payload.personBirthDate
    delete payload.eventName
    delete payload.eventDate
    delete payload.personSnapshot
    delete payload.createdAt
    delete payload.updatedAt

    // Sanitizar: el schema zod del PUT rechaza '' (cadena vacía) en campos enum
    for (const field of ['visitorType', 'acceptedJesus', 'connectionInterest', 'wantsOtherCampus', 'campus', 'affinityGroup', 'registrationOrigin', 'acceptsDataPolicy']) {
      if (payload[field] === '' || payload[field] === null) payload[field] = undefined
    }
    // Textos vacíos → undefined
    for (const field of ['email', 'phone', 'motivationOther', 'spouseName', 'prayerRequest']) {
      if (payload[field] === '' || payload[field] === null) payload[field] = undefined
    }
    if (payload.eventId === '' || payload.eventId === null) delete payload.eventId
    if (!payload.registrationDate) delete payload.registrationDate

    // Resolver la vinculación de persona según el modo elegido
    if (personLinkMode.value === 'existing' && selectedPersonId.value) {
      payload.personId = selectedPersonId.value
      delete payload.newPerson
    } else if (personLinkMode.value === 'new' && newPersonName.value.trim()) {
      payload.newPerson = {
        name: newPersonName.value.trim(),
        email: newPersonEmail.value || undefined,
        phone: newPersonPhone.value || undefined,
      }
      delete payload.personId
    } else if (personLinkMode.value === 'unlink') {
      payload.personId = null
      delete payload.newPerson
    } else {
      // keep: no tocar la vinculación actual
      delete payload.personId
      delete payload.newPerson
    }

    await $fetch(`/api/welcome-cards/${cardId}`, {
      method: 'PUT',
      body: payload,
    })
    navigateTo(`/welcome/${cardId}`)
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage || 'Error al guardar los cambios'
  } finally {
    saving.value = false
  }
}

// Botón principal (editar/salir de edición)
const mainAction = () => {
  if (isEditing.value) {
    navigateTo(`/welcome/${cardId}`)
  } else {
    navigateTo(`/welcome/${cardId}?edit=1`)
  }
}

// Volver contextual: si la tarjeta pertenece a un evento, regresar al tab de Tarjetas de ese evento
const backTo = computed(() => {
  if (card.value?.eventId) {
    return {
      to: `/events/${card.value.eventId}?tab=welcome`,
      label: 'Volver al evento',
    }
  }
  return { to: '/welcome', label: 'Volver a tarjetas' }
})
</script>

<template>
  <div>
    <v-btn
      variant="text"
      color="primary"
      prepend-icon="mdi-arrow-left"
      class="mb-2"
      @click="navigateTo(backTo.to)"
    >
      {{ backTo.label }}
    </v-btn>

    <v-alert v-if="notFound" type="warning" title="Tarjeta no encontrada" text="La tarjeta de conexión no existe o fue eliminada." />

    <div v-else-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate />
    </div>

    <template v-else>
      <div class="d-flex align-center mb-3">
        <h2 class="text-h6 font-weight-bold mt-0">
          {{ isEditing ? 'Editar Tarjeta de Conexión' : 'Tarjeta de Conexión' }}
        </h2>
        <v-spacer />
        <v-btn
          v-if="can(PERMISSIONS.WELCOME_CARDS_UPDATE)"
          color="primary"
          :prepend-icon="isEditing ? 'mdi-eye-outline' : 'mdi-pencil-outline'"
          @click="mainAction"
        >
          {{ isEditing ? 'Ver tarjeta' : 'Editar' }}
        </v-btn>
      </div>

      <!-- Vista de solo lectura -->
      <template v-if="!isEditing && card">
        <v-card class="mb-4">
          <v-card-title>Datos del visitante</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4"><strong>Fecha:</strong> {{ formatDate(card.registrationDate) }}</v-col>
              <v-col cols="12" md="4"><strong>Nombre:</strong> {{ card.name }}</v-col>
              <v-col cols="12" md="4"><strong>Teléfono:</strong> {{ card.phone || '—' }}</v-col>
              <v-col cols="12" md="4"><strong>Email:</strong> {{ card.email || '—' }}</v-col>
              <v-col cols="12" md="4">
                <strong>Tipo:</strong>
                <v-chip size="small" :color="card.visitorType === 'first_time' ? 'blue' : 'orange'" variant="tonal">
                  {{ card.visitorType === 'first_time' ? 'Primera vez' : 'Actualizar info' }}
                </v-chip>
              </v-col>
              <v-col cols="12" md="4"><strong>Motivación:</strong> {{ motivationLabel(card.motivations) }}</v-col>
              <v-col v-if="card.motivationOther" cols="12" md="4"><strong>Otros:</strong> {{ card.motivationOther }}</v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title>Datos de interés</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <strong>Aceptó a Jesús:</strong>
                {{ card.acceptedJesus === 'yes' ? 'Sí' : card.acceptedJesus === 'no' ? 'No' : '—' }}
              </v-col>
              <v-col cols="12" md="4">
                <strong>Interés:</strong>
                {{ card.connectionInterest === 'casa_roca_home' ? 'Casa Roca mi casa' : card.connectionInterest === 'just_visiting' ? 'Solo de visita' : '—' }}
              </v-col>
              <v-col v-if="card.campus" cols="12" md="4">
                <strong>Sede:</strong> {{ card.campus }}
              </v-col>
              <v-col v-if="card.affinityGroup" cols="12" md="4">
                <strong>Grupo de afinidad:</strong>
                <v-chip size="small" color="purple" variant="tonal">{{ affinityLabel(card.affinityGroup) }}</v-chip>
              </v-col>
              <v-col v-if="card.spouseName" cols="12" md="4">
                <strong>Cónyuge:</strong> {{ card.spouseName }}
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title>Datos internos</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6"><strong>Origen del registro:</strong> {{ card.registrationOrigin || '—' }}</v-col>
              <v-col cols="12" md="6"><strong>Petición:</strong> {{ card.prayerRequest || '—' }}</v-col>
              <v-col cols="12" md="6">
                <strong>Datos:</strong>
                {{ card.acceptsDataPolicy === 'yes' ? 'Aceptó' : card.acceptsDataPolicy === 'no' ? 'No aceptó' : '—' }}
              </v-col>
              <v-col v-if="card.eventName" cols="12" md="6">
                <strong>Evento:</strong> {{ card.eventName }}
              </v-col>
              <v-col cols="12" md="6">
                <strong>Persona vinculada:</strong>
                <template v-if="card.personId">
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    class="pa-0"
                    prepend-icon="mdi-account-check-outline"
                    @click="navigateTo(`/persons/${card.personId}`)"
                  >
                    {{ card.personName || 'Ver persona' }}
                  </v-btn>
                </template>
                <template v-else>
                  <v-chip size="small" color="warning" variant="tonal">
                    Sin persona vinculada
                  </v-chip>
                </template>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </template>

      <!-- Vista de edición -->
      <template v-else-if="card">
        <v-alert class="mb-4" type="info" variant="tonal">
          Modo edición. Actualiza los campos y guarda los cambios.
        </v-alert>
        <v-alert v-if="saveError" type="error" class="mb-4">
          {{ saveError }}
        </v-alert>
        <v-card>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="card.registrationDate" label="Día de Hoy" type="date" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="card.visitorType"
                  label="Tipología"
                  :items="[
                    { title: 'Es mi primera vez', value: 'first_time' },
                    { title: 'Actualizar mi información', value: 'update_info' },
                  ]"
                  item-title="title"
                  item-value="value"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="card.name" label="Nombre Completo" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="card.phone" label="Teléfono Móvil" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="card.email" label="Correo Electrónico" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="card.motivations"
                  label="¿Qué te motivó?"
                  :items="[
                    { title: 'Programa de TV H&C', value: 'tv_program' },
                    { title: 'Invitación', value: 'invitation' },
                    { title: 'Revista H&C', value: 'magazine' },
                    { title: 'Redes Sociales', value: 'social_media' },
                    { title: 'Otros', value: 'other' },
                  ]"
                  item-title="title"
                  item-value="value"
                  multiple
                />
              </v-col>
              <v-col v-if="card.motivations?.includes('other')" cols="12" md="6">
                <v-text-field v-model="card.motivationOther" label="Otros" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="card.acceptedJesus"
                  label="Aceptó a Jesús"
                  :items="[
                    { title: 'Sí', value: 'yes' },
                    { title: 'No', value: 'no' },
                  ]"
                  item-title="title"
                  item-value="value"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="card.connectionInterest"
                  label="Interés"
                  :items="[
                    { title: 'Casa Roca mi casa', value: 'casa_roca_home' },
                    { title: 'Solo de visita', value: 'just_visiting' },
                  ]"
                  item-title="title"
                  item-value="value"
                  clearable
                />
              </v-col>
              <v-col v-if="card.connectionInterest === 'casa_roca_home'" cols="12" md="6">
                <v-select
                  v-model="card.wantsOtherCampus"
                  label="¿Otra sede?"
                  :items="[
                    { title: 'Sí', value: 'yes' },
                    { title: 'No', value: 'no' },
                  ]"
                  item-title="title"
                  item-value="value"
                  clearable
                />
              </v-col>
              <v-col v-if="card.wantsOtherCampus === 'yes'" cols="12" md="6">
                <v-text-field v-model="card.campus" label="Sede" />
              </v-col>
              <v-col v-if="card.connectionInterest === 'casa_roca_home'" cols="12" md="6">
                <v-select
                  v-model="card.affinityGroup"
                  label="Grupo de Afinidad"
                  :items="[
                    { title: 'Años Dorados', value: 'anios_dorados' },
                    { title: 'Casa2', value: 'casa2' },
                    { title: 'Hombres de Bien', value: 'hombres_de_bien' },
                    { title: 'J25', value: 'j25' },
                    { title: 'Mujer Integral', value: 'mujer_integral' },
                    { title: 'tMt', value: 'tmt' },
                  ]"
                  item-title="title"
                  item-value="value"
                  clearable
                />
              </v-col>
              <v-col v-if="card.affinityGroup === 'casa2'" cols="12" md="6">
                <v-text-field v-model="card.spouseName" label="Nombre Cónyuge" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="card.registrationOrigin" label="Origen del Registro" />
              </v-col>
              <v-col cols="12" md="6">
                <v-textarea v-model="card.prayerRequest" label="Petición de Oración" rows="2" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="card.acceptsDataPolicy"
                  label="Acepta tratamiento de datos"
                  :items="[
                    { title: 'Sí', value: 'yes' },
                    { title: 'No', value: 'no' },
                  ]"
                  item-title="title"
                  item-value="value"
                />
              </v-col>
            </v-row>

            <!-- Persona vinculada: corregir si la tarjeta quedó mal asociada -->
            <v-divider class="my-4" />
            <p class="text-subtitle-1 font-weight-bold mb-2">
              Persona vinculada
            </p>
            <v-alert
              v-if="card.personId"
              type="info"
              variant="tonal"
              class="mb-3"
              :title="card.personName || 'Persona vinculada'"
              text="Si la tarjeta quedó vinculada a la persona equivocada, puedes cambiarla o desvincularla."
            />
            <v-select
              v-model="personLinkMode"
              label="Acción con la persona"
              :items="[
                { title: card.personId ? 'Mantener la persona actual' : 'Dejar sin persona vinculada', value: 'keep' },
                { title: 'Vincular a una persona existente', value: 'existing' },
                { title: 'Crear y vincular persona nueva', value: 'new' },
                { title: 'Desvincular persona', value: 'unlink' },
              ]"
              item-title="title"
              item-value="value"
              dense
              class="mb-3"
            />
            <template v-if="personLinkMode === 'existing'">
              <v-autocomplete
                v-model="selectedPersonId"
                label="Buscar persona existente (nombre, teléfono o email)"
                :items="searchResults"
                item-title="name"
                item-value="id"
                :loading="searchLoading"
                @update:search="onPersonSearch"
              />
            </template>
            <template v-else-if="personLinkMode === 'new'">
              <v-text-field
                v-model="newPersonName"
                label="Nombre completo de la persona nueva"
                placeholder="Nombres y Apellidos"
                required
              />
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="newPersonEmail" label="Correo (opcional)" type="email" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="newPersonPhone" label="Teléfono (opcional)" />
                </v-col>
              </v-row>
            </template>
            <v-alert
              v-else-if="personLinkMode === 'unlink'"
              type="warning"
              variant="tonal"
              class="mb-2"
              text="La persona NO se eliminará del sistema; solo se quitará la vinculación de esta tarjeta."
            />

            <div class="d-flex justify-end mt-4">
              <v-btn variant="text" class="mr-2" @click="navigateTo(`/welcome/${cardId}`)">Cancelar</v-btn>
              <v-btn color="primary" prepend-icon="mdi-content-save-outline" :loading="saving" @click="saveEdits">
                Guardar cambios
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </template>
    </template>
  </div>
</template>
