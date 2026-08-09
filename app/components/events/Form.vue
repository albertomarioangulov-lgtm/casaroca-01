<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { eventFormSchema } from '~/composables/events/useEventForm'
import { useEventUI } from '~/composables/events/useEventUI'
import { formatDateInput } from '~/utils/dates'

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'warning', message: string): void
}>()

const { isFormOpen, selectedEvent, closeForm } = useEventUI()
const isEditing = computed(() => !!selectedEvent.value)
const { saving, submitError, fieldErrors, saveEvent } = useEventForm()
const formWarning = ref('')

const formRef = ref<any>(null)

const statusOptions = [
  { title: 'Programado', value: 'scheduled' },
  { title: 'Activo', value: 'active' },
  { title: 'Finalizado', value: 'finished' },
  { title: 'Cancelado', value: 'cancelled' },
]

const rules: Record<string, ((v: any) => string | boolean)[]> = {
  name: [
    (v: string) => {
      const result = eventFormSchema.shape.name.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
  date: [
    (v: any) => {
      const result = eventFormSchema.shape.date.safeParse(formatDateInput(v))
      return result.success || result.error.issues[0]?.message || true
    }
  ],
}

const form = reactive({
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  status: 'scheduled' as string,
  ministryId: '',
  parentEventId: '',
  includeRokaKids: false,
  welcomeEnabled: true,
})

// Ministerios para el selector
const { data: ministries } = await useFetch('/api/ministries', {
  headers: useRequestHeaders(['cookie']),
})

// Eventos disponibles como "padre" (solo eventos principales)
const parentEvents = ref<Array<Record<string, any>>>([])
const fetchParentEvents = async () => {
  try {
    const data = await $fetch('/api/events', {
      query: { limit: 200, showChildren: '1' },
      headers: useRequestHeaders(['cookie']),
    }) as any
    const selfId = selectedEvent.value?.id
    parentEvents.value = (data?.items ?? []).filter(
      (ev: any) => !ev.parentEventId && ev.id !== selfId
    )
  } catch {
    parentEvents.value = []
  }
}

// ¿Existe un ministerio de niños (RocaKids/RokaKids) para habilitar el switch?
const kidsMinistryExists = ref(true)
const checkKidsMinistry = async () => {
  try {
    const data = await $fetch('/api/ministries', {
      query: { search: 'kids', limit: 10 },
      headers: useRequestHeaders(['cookie']),
    }) as any
    const items = data?.items ?? []
    kidsMinistryExists.value = items.some((m: any) => {
      const name = (m.name || '').toLowerCase()
      const code = (m.code || '').toLowerCase()
      return /roca\s*kids/.test(name) || /roca\s*kids/.test(code) || name.includes('rokakids') || name.includes('rocakids') || code.includes('rokakids') || code.includes('rocakids')
    })
  } catch {
    kidsMinistryExists.value = true // no bloquear por defecto
  }
}

watch(selectedEvent, (newEvent) => {
  if (newEvent) {
    form.name = newEvent.name || ''
    form.date = newEvent.date ? (new Date(newEvent.date).toISOString().split('T')[0] ?? '') : ''
    form.startTime = newEvent.startTime || ''
    form.endTime = newEvent.endTime || ''
    form.status = newEvent.status || 'scheduled'
    form.ministryId = newEvent.ministryId || ''
    form.parentEventId = newEvent.parentEventId || ''
    form.welcomeEnabled = newEvent.welcomeEnabled ?? true
    // includeRokaKids solo aplica al crear (no se restaura al editar)
  } else {
    form.name = ''
    form.date = ''
    form.startTime = ''
    form.endTime = ''
    form.status = 'scheduled'
    form.ministryId = ''
    form.parentEventId = ''
    form.includeRokaKids = false
    form.welcomeEnabled = true
  }
}, { immediate: true })

watch(isFormOpen, async (isOpen) => {
  if (isOpen) {
    submitError.value = ''
    fieldErrors.value = {}
    formWarning.value = ''
    await Promise.all([fetchParentEvents(), checkKidsMinistry()])
    if (!selectedEvent.value) {
      form.name = ''
      form.date = ''
      form.startTime = ''
      form.endTime = ''
      form.status = 'scheduled'
      form.ministryId = ''
      form.parentEventId = ''
      form.includeRokaKids = false
      form.welcomeEnabled = true
    }
  }
})

const submit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  const result = await saveEvent(
    {
      name: form.name,
      date: formatDateInput(form.date),
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
      ministryId: form.ministryId || undefined,
      parentEventId: form.parentEventId || undefined,
      includeRokaKids: isEditing ? undefined : form.includeRokaKids,
      welcomeEnabled: form.welcomeEnabled,
    },
    selectedEvent.value?.id
  )

  if (result.success) {
    if (result.warning) {
      // No cerrar el modal; mostrar la advertencia en el propio formulario
      formWarning.value = result.warning
      return
    }
    closeForm()
    emit('saved')
  } else if (result.warning) {
    formWarning.value = result.warning
  }
}
</script>

<template>
  <v-dialog :model-value="isFormOpen" max-width="600" @update:model-value="closeForm">
    <v-card>
      <v-progress-linear
        :color="isEditing ? 'orange' : 'blue'"
        :indeterminate="saving"
        :model-value="saving ? undefined : 100"
      />
      <v-card-title>{{ isEditing ? 'Editar evento' : 'Crear nuevo evento' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>
        <v-alert v-if="formWarning" type="warning" class="mb-4" closable @click:close="formWarning = ''">
          {{ formWarning }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-row>
            <v-col cols="12" md="12">
              <v-text-field
                v-model="form.name"
                label="Nombre del evento"
                outlined
                required
                :rules="rules.name"
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-autocomplete
                v-model="form.ministryId"
                label="Ministerio (opcional)"
                :items="(ministries as any)?.items ?? []"
                item-title="name"
                item-value="id"
                clearable
                hint="Opcional. Se usa para eventos de un ministerio específico (ej. RocaKids). Dejar vacío para servicios generales."
                outlined
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-select
                v-model="form.parentEventId"
                label="Evento padre (opcional)"
                :items="parentEvents"
                item-title="name"
                item-value="id"
                clearable
                hint="Si es un evento satélite de otro (ej. RokaKids dentro de un servicio de domingo), selecciona el evento principal."
                outlined
              />
            </v-col>

            <v-col v-if="!isEditing" cols="12" md="12">
              <v-switch
                v-model="form.includeRokaKids"
                color="primary"
                label="Incluye servicio de niños (RocaKids)"
                :disabled="!!form.parentEventId || !kidsMinistryExists"
                :hint="!kidsMinistryExists
                  ? 'No se encontró el ministerio de niños (RocaKids). Créalo en Ministerios primero.'
                  : 'Crea automáticamente el evento satélite de niños para este evento.'"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-switch
                v-model="form.welcomeEnabled"
                color="primary"
                label="Permitir registro de nuevos (Bienvenida Nicodemo)"
                hint="Muestra el botón de Tarjeta de Conexión en este evento."
                persistent-hint
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-date-input
                v-model="form.date"
                label="Fecha"
                required
                :rules="rules.date"
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-text-field
                v-model="form.startTime"
                label="Hora inicio"
                type="time"
                outlined
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-text-field
                v-model="form.endTime"
                label="Hora fin"
                type="time"
                outlined
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-select
                v-model="form.status"
                label="Estado"
                outlined
                :items="statusOptions"
                item-title="title"
                item-value="value"
              />
            </v-col>
          </v-row>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
            <v-btn color="primary" type="submit" :loading="saving">
              {{ isEditing ? 'Guardar cambios' : 'Crear evento' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>