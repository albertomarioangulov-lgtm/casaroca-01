<script setup lang="ts">
// Modal de formulario de persona (crear/editar)
// Patrón UsersForm: lee estado global de usePersonUI (useState) y emite 'saved'.

import { personFormSchema } from '~/composables/persons/usePersonForm'

const { isFormOpen, selectedPerson, closeForm } = usePersonUI()
const { saving, submitError, fieldErrors, savePerson, toDateInputValue } = usePersonForm()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const isEditing = computed(() => !!selectedPerson.value)

const form = ref<Record<string, any>>({
  name: '',
  birthDate: '',
  phone: '',
  email: '',
  gender: '',
  address: '',
  maritalStatus: '',
  membershipDate: '',
  baptismDate: '',
})

type VuetifyRule = (v: any) => string | boolean

// Reglas Vuetify derivadas del esquema zod (como en Users)
const rules: Record<string, VuetifyRule[]> = {
  name: [
    (v: string) => {
      const result = personFormSchema.shape.name.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
  email: [
    (v: string) => {
      if (!v) return true
      const result = personFormSchema.shape.email.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ]
}

const resetForm = () => {
  form.value = {
    name: '', birthDate: '', phone: '', email: '', gender: '',
    address: '', maritalStatus: '', membershipDate: '', baptismDate: '',
  }
}

// Cuando se abre el modal: copiar datos de la persona seleccionada (instantáneo, como Users)
// o resetear al crear. NO hace fetch — la fila ya trae los datos básicos.
watch(isFormOpen, (open) => {
  if (!open) return
  submitError.value = ''
  fieldErrors.value = {}
  resetForm()
  const p = selectedPerson.value
  if (p) {
    form.value = {
      name: p.name ?? '',
      birthDate: toDateInputValue(p.birthDate),
      phone: p.phone ?? '',
      email: p.email ?? '',
      gender: p.gender ?? '',
      address: p.address ?? '',
      maritalStatus: p.maritalStatus ?? '',
      membershipDate: toDateInputValue(p.membershipDate),
      baptismDate: toDateInputValue(p.baptismDate),
    }
  }
})

const save = async () => {
  const success = await savePerson(form.value, selectedPerson.value?.id ?? undefined)
  if (success) {
    emit('saved')
    closeForm()
  }
}
</script>

<template>
  <v-dialog
    :model-value="isFormOpen"
    max-width="600"
    @update:model-value="(v: boolean) => { if (!v) closeForm() }"
  >
    <v-card>
      <v-progress-linear
        :color="isEditing ? 'orange' : 'blue'"
        :indeterminate="saving"
        :model-value="saving ? undefined : 100"
      />
      <v-card-title>
        {{ isEditing ? 'Editar Persona' : 'Nueva Persona' }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-3" :text="submitError" />
        <v-form @submit.prevent="save">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.name" label="Nombre completo" required :rules="rules.name" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.birthDate" label="Fecha de nacimiento" type="date" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.phone" label="Teléfono" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.email" label="Email" type="email" :rules="rules.email" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.gender"
                label="Género"
                :items="[
                  { title: 'Hombre', value: 'male' },
                  { title: 'Mujer', value: 'female' },
                ]"
                item-title="title"
                item-value="value"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.maritalStatus"
                label="Estado civil"
                :items="[
                  { title: 'Soltero/a', value: 'single' },
                  { title: 'Casado/a', value: 'married' },
                  { title: 'Divorciado/a', value: 'divorced' },
                  { title: 'Viudo/a', value: 'widowed' },
                ]"
                item-title="title"
                item-value="value"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.address" label="Dirección" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.membershipDate" label="Fecha de membresía (ingreso)" type="date" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.baptismDate" label="Fecha de bautismo" type="date" hide-details />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">
          {{ isEditing ? 'Guardar cambios' : 'Crear persona' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>