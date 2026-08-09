<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const cardId = route.params.id as string
const isEditing = route.query.edit === '1'

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

const saveEdits = async () => {
  if (!card.value) return
  saving.value = true
  saveError.value = ''
  try {
    await $fetch(`/api/welcome-cards/${cardId}`, {
      method: 'PUT',
      body: card.value,
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
  if (isEditing) {
    navigateTo(`/welcome/${cardId}`)
  } else {
    navigateTo(`/welcome/${cardId}?edit=1`)
  }
}
</script>

<template>
  <div>
    <v-btn
      variant="text"
      color="primary"
      prepend-icon="mdi-arrow-left"
      class="mb-2"
      @click="navigateTo('/welcome')"
    >
      Volver a tarjetas
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
