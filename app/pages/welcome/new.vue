<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

import {
  CHURCH_CAMPUSES,
  VISITOR_TYPES,
  VISIT_MOTIVATIONS,
  CONNECTION_INTEREST,
  FOLLOW_UP_INTERESTS,
  AFFINITY_GROUPS,
  REGISTRATION_ORIGINS,
} from '~~/shared/welcomeCard'
import { useWelcomeCardForm } from '~/composables/welcome/useWelcomeCardForm'

const route = useRoute()
const eventIdFromRoute = (route.query.eventId as string) || ''

const { can, PERMISSIONS } = usePermissions()

const {
  saving,
  submitError,
  fieldErrors,
  form,
  step,
  maxStep,
  stepsDone,
  markStepDone,
  gotoStep,
  nextStep,
  prevStep,
  saveCard,
  resetForm,
  // Persona
  personSearch,
  searchResults,
  searchLoading,
  selectedPerson,
  creatingNewPerson,
  startPersonSearch,
  selectPerson,
  startNewPerson,
  resetPersonSelection,
} = useWelcomeCardForm()

const savedMessage = ref('')

// Condicionales de la sección de interés
const showFollowUp = computed(() => form.value.connectionInterest === 'casa_roca_home')
const showOtherCampus = computed(() => form.value.wantsOtherCampus === 'yes')
const showSpouseName = computed(() => form.value.affinityGroup === 'casa2')

// Items de constantes
const campusItems = (CHURCH_CAMPUSES as readonly string[]).map((c: string) => ({ title: c, value: c }))
const visitorTypeItems = (VISITOR_TYPES as readonly { title: string; value: string }[]).map((t) => ({ title: t.title, value: t.value }))
const motivationItems = (VISIT_MOTIVATIONS as readonly { title: string; value: string }[]).map((m) => ({ title: m.title, value: m.value }))
const connectionItems = (CONNECTION_INTEREST as readonly { title: string; value: string }[]).map((c) => ({ title: c.title, value: c.value }))
const interestItems = (FOLLOW_UP_INTERESTS as readonly { title: string; value: string }[]).map((i) => ({ title: i.title, value: i.value }))
const affinityItems = (AFFINITY_GROUPS as readonly { title: string; value: string }[]).map((g) => ({ title: g.title, value: g.value }))
const originItems = (REGISTRATION_ORIGINS as readonly string[]).map((o: string) => ({ title: o, value: o }))

// Avanzar con validación
const next = () => {
  if (step.value === 1 && form.value.visitorType === 'update_info' && !selectedPerson.value) {
    fieldErrors.value.personSearch = 'Debes seleccionar una persona existente para actualizar su información'
    return
  }
  if (step.value === 2 && (!form.value.name || !form.value.name.trim())) {
    fieldErrors.value.name = 'El nombre es requerido'
    return
  }
  fieldErrors.value.personSearch = undefined
  fieldErrors.value.name = undefined
  markStepDone(step.value)
  nextStep()
}

const prev = () => {
  prevStep()
}

// En el último paso, "Continuar"/"Guardar Tarjeta" guarda; en el resto avanza
const handleNext = () => {
  if (step.value >= maxStep.value) {
    finish()
  } else {
    next()
  }
}

const finish = async () => {
  const success = await saveCard(eventIdFromRoute || undefined)
  if (success) {
    if (eventIdFromRoute) {
      navigateTo(`/events/${eventIdFromRoute}?tab=welcome`)
    } else {
      navigateTo('/welcome')
    }
  }
}

// Guarda la tarjeta actual y deja el formulario listo para registrar otra del mismo evento
const saveAndAddAnother = async () => {
  savedMessage.value = ''
  submitError.value = ''
  const success = await saveCard(eventIdFromRoute || undefined)
  if (success) {
    resetForm()
    fieldErrors.value = {}
    savedMessage.value = eventIdFromRoute
      ? 'Tarjeta guardada. Ya puedes registrar otra persona de este evento.'
      : 'Tarjeta guardada. Ya puedes registrar otra.'
  }
}

const cancel = () => {
  if (eventIdFromRoute) {
    navigateTo(`/events/${eventIdFromRoute}?tab=welcome`)
  } else {
    navigateTo('/welcome')
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
      @click="cancel"
    >
      Volver
    </v-btn>

    <div class="d-flex align-center mb-3">
      <h2 class="text-h6 font-weight-bold mt-0">
        Tarjeta de Conexión
      </h2>
      <v-spacer />
      <span class="text-caption text-medium-emphasis">
        Paso {{ step }} de {{ maxStep }}
      </span>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Ministerio de Bienvenida — informe de la visita de nuevas personas
    </p>

    <v-alert v-if="submitError" type="error" class="mb-4" closable @click:close="submitError = ''">
      {{ submitError }}
    </v-alert>
    <v-alert v-if="savedMessage" type="success" class="mb-4" closable @click:close="savedMessage = ''">
      {{ savedMessage }}
    </v-alert>

    <v-stepper v-model="step">
      <v-stepper-header>
        <v-stepper-item :value="1" title="Persona" />
        <v-stepper-item :value="2" title="Visitante" />
        <v-stepper-item :value="3" title="Interés" />
        <v-stepper-item :value="4" title="Internos" />
        <v-stepper-item :value="5" title="Confirmar" />
      </v-stepper-header>

      <v-stepper-window>
        <!-- Paso 1: Persona -->
        <v-stepper-window-item :value="1">
          <v-card flat>
            <v-card-text>
              <v-alert
                type="info"
                variant="tonal"
                class="mb-3"
                title="¿La persona ya está registrada?"
                text="Si dejó a su hijo en RokaKids, si ya es miembro o asistió antes, búscala para no duplicar."
              />
              <v-alert v-if="fieldErrors.personSearch" type="error" class="mb-3">
                {{ fieldErrors.personSearch }}
              </v-alert>

              <template v-if="creatingNewPerson">
                <v-alert
                  type="info"
                  variant="tonal"
                  class="mb-3"
                  title="Se registrará una nueva persona"
                  text="Llena sus datos en el siguiente paso (Datos del visitante)."
                />
                <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" @click="resetPersonSelection">
                  Volver a buscar
                </v-btn>
              </template>
              <template v-else-if="!selectedPerson">
                <v-text-field
                  v-model="personSearch"
                  label="Buscar persona existente (nombre, teléfono o email)"
                  prepend-inner-icon="mdi-magnify"
                  :loading="searchLoading"
                  clearable
                  hide-details
                  class="mb-3"
                  @update:model-value="startPersonSearch"
                />
                <v-list v-if="searchResults.length" dense rounded variant="outlined" class="mb-3">
                  <v-list-item
                    v-for="person in searchResults"
                    :key="person.id"
                    :title="person.name"
                    :subtitle="[person.phone, person.email].filter(Boolean).join(' • ')"
                    @click="selectPerson(person)"
                  >
                    <template #append>
                      <v-icon color="primary">mdi-check</v-icon>
                    </template>
                  </v-list-item>
                </v-list>

                <v-divider class="my-4">
                  <span class="text-caption text-medium-emphasis">o</span>
                </v-divider>

                <v-btn
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-account-plus-outline"
                  @click="startNewPerson"
                >
                  Registrar nueva persona
                </v-btn>
              </template>

              <template v-else>
                <v-card variant="outlined" class="mb-3">
                  <v-card-text class="d-flex align-center">
                    <v-icon color="success" class="mr-3">mdi-account-check-outline</v-icon>
                    <div>
                      <div class="font-weight-bold">{{ selectedPerson.name }}</div>
                      <div v-if="selectedPerson.phone" class="text-caption">{{ selectedPerson.phone }}</div>
                      <div v-if="selectedPerson.email" class="text-caption">{{ selectedPerson.email }}</div>
                    </div>
                    <v-spacer />
                    <v-btn variant="text" size="small" @click="resetPersonSelection">Cambiar</v-btn>
                  </v-card-text>
                </v-card>
              </template>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>

        <!-- Paso 2: Visitante -->
        <v-stepper-window-item :value="2">
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.registrationDate"
                    label="Día de Hoy"
                    type="date"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.visitorType"
                    label="Tipología"
                    :items="visitorTypeItems"
                    item-title="title"
                    item-value="value"
                    required
                    hint="Es mi primera vez: Si es la primera vez que asistes. Actualizar mi información: Si has asistido antes."
                    persistent-hint
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.name"
                    label="Nombre Completo"
                    placeholder="Nombres y Apellidos"
                    :error-messages="fieldErrors.name"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.email"
                    label="Correo Electrónico"
                    type="email"
                    :error-messages="fieldErrors.email"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.phone"
                    label="Teléfono Móvil"
                    placeholder="(60) + (5) + Número"
                    :error-messages="fieldErrors.phone"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.motivations"
                    label="¿Qué te motivó a visitarnos?"
                    :items="motivationItems"
                    item-title="title"
                    item-value="value"
                    multiple
                    clearable
                  />
                </v-col>
                <v-col v-if="form.motivations?.includes('other')" cols="12" md="6">
                  <v-text-field
                    v-model="form.motivationOther"
                    label="Otros (¿qué te motivó?)"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>

        <!-- Paso 3: Interés -->
        <v-stepper-window-item :value="3">
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="8">
                  <v-radio-group v-model="form.acceptedJesus" label="He aceptado a Jesús por primera vez como Señor y Salvador">
                    <v-radio label="Sí" value="yes" />
                    <v-radio label="No" value="no" />
                  </v-radio-group>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <v-radio-group v-model="form.connectionInterest" label="Estoy interesado en más información sobre:">
                <v-radio
                  v-for="item in connectionItems"
                  :key="item.value"
                  :label="item.title"
                  :value="item.value"
                />
              </v-radio-group>

              <!-- Seguimiento: Casa Roca mi casa -->
              <template v-if="showFollowUp">
                <v-divider class="my-4" />
                <p class="text-subtitle-2 font-weight-bold mb-2">
                  Seguimiento Tarjeta de Conexión
                </p>
                <v-row>
                  <v-col cols="12" md="8">
                    <v-radio-group v-model="form.wantsOtherCampus" label="¿Deseas conectarte en la sede de otra iglesia de Casa Sobre la Roca?">
                      <v-radio label="Sí" value="yes" />
                      <v-radio label="No" value="no" />
                    </v-radio-group>
                  </v-col>
                  <v-col v-if="showOtherCampus" cols="12" md="8">
                    <v-select
                      v-model="form.campus"
                      label="Sede Casa Sobre la Roca"
                      :items="campusItems"
                      item-title="title"
                      item-value="value"
                      :error-messages="fieldErrors.campus"
                      hint="Selecciona la sede donde deseas seguir conectado"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-select
                      v-model="form.followUpInterests"
                      label="Estoy interesado en más información sobre:"
                      :items="interestItems"
                      item-title="title"
                      item-value="value"
                      multiple
                    />
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-select
                      v-model="form.affinityGroup"
                      label="Grupo de Afinidad"
                      :items="affinityItems"
                      item-title="title"
                      item-value="value"
                      hint="Selecciona el grupo pequeño de tu mayor interés"
                      persistent-hint
                    />
                  </v-col>
                  <v-col v-if="showSpouseName" cols="12" md="8">
                    <v-text-field
                      v-model="form.spouseName"
                      label="Nombre Completo Cónyuge"
                      placeholder="Nombres y Apellidos"
                    />
                  </v-col>
                </v-row>
              </template>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>

        <!-- Paso 4: Internos -->
        <v-stepper-window-item :value="4">
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="8">
                  <v-select
                    v-model="form.registrationOrigin"
                    label="Origen del Registro"
                    :items="originItems"
                    item-title="title"
                    item-value="value"
                    hint="Selecciona el servicio o actividad por la que nos conociste"
                    persistent-hint
                  />
                </v-col>
                <v-col cols="12" md="8">
                  <v-textarea
                    v-model="form.prayerRequest"
                    label="Petición de Oración"
                    hint="Puede ser de gratitud, situación familiar, crecimiento espiritual, etc. En caso de no tener escribe N/A."
                    persistent-hint
                    rows="3"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>

        <!-- Paso 5: Confirmar -->
        <v-stepper-window-item :value="5">
          <v-card flat>
            <v-card-text>
              <v-switch
                v-model="form.acceptsDataPolicy"
                color="primary"
                label="Acepto los términos y condiciones de tratamiento de datos de acuerdo con la política de tratamiento de datos de Casa Sobre La Roca"
                true-value="yes"
                false-value="no"
              />
              <div class="text-caption text-medium-emphasis mb-4">
                Al aceptar los términos y condiciones, nos permites colocarnos en contacto contigo para que hagas parte de nuestro proceso.
              </div>

              <v-divider class="mb-4" />

              <p class="text-subtitle-2 font-weight-bold mb-2">Resumen</p>
              <v-list dense>
                <v-list-item>
                  <template #prepend><v-icon class="mr-2" size="small">mdi-account</v-icon></template>
                  <v-list-item-title>{{ form.name || '—' }}</v-list-item-title>
                  <v-list-item-subtitle>{{ form.visitorType === 'first_time' ? 'Primera vez' : 'Actualizar información' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="form.phone">
                  <template #prepend><v-icon class="mr-2" size="small">mdi-phone</v-icon></template>
                  <v-list-item-title>{{ form.phone }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="form.email">
                  <template #prepend><v-icon class="mr-2" size="small">mdi-email</v-icon></template>
                  <v-list-item-title>{{ form.email }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="form.campus">
                  <template #prepend><v-icon class="mr-2" size="small">mdi-church</v-icon></template>
                  <v-list-item-title>Sede: {{ form.campus }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="form.affinityGroup">
                  <template #prepend><v-icon class="mr-2" size="small">mdi-account-group</v-icon></template>
                  <v-list-item-title>Grupo de afinidad: {{ form.affinityGroup }}</v-list-item-title>
                </v-list-item>
              </v-list>

              <v-alert v-if="fieldErrors.acceptsDataPolicy" type="error" class="mt-3">
                Debes aceptar el tratamiento de datos para guardar.
              </v-alert>

              <div class="d-flex justify-end flex-wrap ga-2 mt-4">
                <v-btn
                  variant="tonal"
                  color="primary"
                  :loading="saving"
                  prepend-icon="mdi-plus"
                  @click="saveAndAddAnother"
                >
                  Guardar y registrar otra
                </v-btn>
                <v-btn
                  color="primary"
                  :loading="saving"
                  prepend-icon="mdi-check"
                  @click="finish"
                >
                  Guardar Tarjeta
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>
      </v-stepper-window>

      <v-stepper-actions
        prev-text="Atrás"
        next-text="Continuar"
        @click:prev="prev"
        @click:next="handleNext"
      />
    </v-stepper>
  </div>
</template>