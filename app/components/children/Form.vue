<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { childFormSchema } from '~/composables/children/useChildForm'
import { useChildUI } from '~/composables/children/useChildUI'
import { formatDateInput } from '~/utils/dates'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { isFormOpen, selectedChild, closeForm } = useChildUI()
const isEditing = computed(() => !!selectedChild.value)
const { saving, submitError, saveChild } = useChildForm()

const formRef = ref<any>(null)

const rules: Record<string, ((v: any) => string | boolean)[]> = {
  name: [
    (v: string) => {
      const result = childFormSchema.shape.name.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
}

const form = reactive({
  name: '',
  birthDate: '',
})

watch(selectedChild, (newChild) => {
  if (newChild) {
    form.name = newChild.name || ''
    form.birthDate = newChild.birthDate ? (new Date(newChild.birthDate).toISOString().split('T')[0] ?? '') : ''
  } else {
    form.name = ''
    form.birthDate = ''
  }
}, { immediate: true })

watch(isFormOpen, (isOpen) => {
  if (isOpen) {
    submitError.value = ''
    if (!selectedChild.value) {
      form.name = ''
      form.birthDate = ''
    }
  }
})

const submit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  const success = await saveChild(
    {
      name: form.name,
      birthDate: formatDateInput(form.birthDate) || undefined,
    },
    selectedChild.value?.id
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
      <v-card-title>{{ isEditing ? 'Editar niño' : 'Registrar nuevo niño' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Nombre del niño"
                outlined
                required
                :rules="rules.name"
              />
            </v-col>

            <v-col cols="12">
              <v-date-input
                v-model="form.birthDate"
                label="Fecha de nacimiento"
                hint="Opcional. Se usa para calcular la edad"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
            <v-btn color="primary" type="submit" :loading="saving">
              {{ isEditing ? 'Guardar cambios' : 'Registrar niño' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>