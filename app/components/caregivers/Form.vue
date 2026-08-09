<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { caregiverFormSchema } from '~/composables/caregivers/useCaregiverForm'
import { useCaregiverUI } from '~/composables/caregivers/useCaregiverUI'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { isFormOpen, selectedCaregiver, closeForm } = useCaregiverUI()
const isEditing = computed(() => !!selectedCaregiver.value)
const { saving, submitError, saveCaregiver } = useCaregiverForm()

const formRef = ref<any>(null)

const rules: Record<string, ((v: any) => string | boolean)[]> = {
  name: [
    (v: string) => {
      const result = caregiverFormSchema.shape.name.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
}

const form = reactive({
  name: '',
  phone: '',
})

watch(selectedCaregiver, (newCaregiver) => {
  if (newCaregiver) {
    form.name = newCaregiver.name || ''
    form.phone = newCaregiver.phone || ''
  } else {
    form.name = ''
    form.phone = ''
  }
}, { immediate: true })

watch(isFormOpen, (isOpen) => {
  if (isOpen) {
    submitError.value = ''
    if (!selectedCaregiver.value) {
      form.name = ''
      form.phone = ''
    }
  }
})

const submit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  const success = await saveCaregiver(
    {
      name: form.name,
      phone: form.phone || undefined,
    },
    selectedCaregiver.value?.id
  )

  if (success) {
    closeForm()
    emit('saved')
  }
}
</script>

<template>
  <v-dialog :model-value="isFormOpen" max-width="500" @update:model-value="closeForm">
    <v-card>
      <v-progress-linear
        :color="isEditing ? 'orange' : 'blue'"
        :indeterminate="saving"
        :model-value="saving ? undefined : 100"
      />
      <v-card-title>{{ isEditing ? 'Editar acudiente' : 'Registrar nuevo acudiente' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Nombre del acudiente"
                outlined
                required
                :rules="rules.name"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.phone"
                label="Teléfono"
                outlined
                type="tel"
              />
            </v-col>
          </v-row>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
            <v-btn color="primary" type="submit" :loading="saving">
              {{ isEditing ? 'Guardar cambios' : 'Registrar acudiente' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>