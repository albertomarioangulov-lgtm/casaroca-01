<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { useUserForm } from '~/composables/users/useUserForm'
import { useUserUI } from '~/composables/users/useUserUI'
import { ROLE_DEFINITIONS, AVAILABLE_ROLES } from '~~/shared/permissions'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { isFormOpen, selectedUser, closeForm } = useUserUI()
const isEditing = computed(() => !!selectedUser.value)
const { saving, submitError, fieldErrors, saveUser, validateField } = useUserForm()

const formRef = ref<any>(null)

const userSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
})

type VuetifyRule = (v: any) => string | boolean

const rules: Record<string, VuetifyRule[]> = {
  name: [
    (v: string) => {
      const result = userSchema.shape.name.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
  email: [
    (v: string) => {
      const result = userSchema.shape.email.safeParse(v)
      return result.success || result.error.issues[0]?.message || true
    }
  ],
  password: [
    (v: string) => {
      if (isEditing.value && !v) return true
      if (!v) return 'La contraseña es requerida'
      return v.length >= 6 || 'La contraseña debe tener al menos 6 caracteres'
    }
  ]
}

const form = reactive({
  name: '',
  email: '',
  password: '',
  roles: [] as string[],
})

watch(selectedUser, (newUser) => {
  if (newUser) {
    form.name = newUser.name || ''
    form.email = newUser.email || ''
    form.password = ''
    form.roles = newUser.roles ?? []
  } else {
    form.name = ''
    form.email = ''
    form.password = ''
    form.roles = []
  }
}, { immediate: true })

watch(isFormOpen, (isOpen) => {
  if (isOpen) {
    submitError.value = ''
    fieldErrors.value = {}
    // Si estamos creando (no hay selectedUser), resetear el objeto form
    if (!selectedUser.value) {
      form.name = ''
      form.email = ''
      form.password = ''
      form.roles = []
    }
  }
})

const submit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  const success = await saveUser(
    {
      name: form.name,
      email: form.email,
      password: form.password,
      roles: form.roles.join(', '),
    },
    selectedUser.value?.id
  )

  if (success) {
    closeForm()
    emit('saved')
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
      <v-card-title>{{ isEditing ? 'Editar usuario' : 'Crear nuevo usuario' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="submitError" type="error" class="mb-4">
          {{ submitError }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-row>
            <v-col cols="12" md="12">
              <v-text-field
                v-model="form.name"
                label="Nombre"
                outlined
                required
                :rules="rules.name"
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-text-field
                v-model="form.email"
                label="Correo electrónico"
                outlined
                required
                type="email"
                :rules="rules.email"
              />
            </v-col>
            
            <v-col cols="12" md="12">
              <v-text-field
                v-model="form.password"
                :label="isEditing ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'"
                outlined
                :required="!isEditing"
                type="password"
                :rules="rules.password"
              />
            </v-col>

            <v-col cols="12" md="12">
              <v-select
                v-model="form.roles"
                label="Roles"
                outlined
                :items="AVAILABLE_ROLES"
                multiple
                chips
                closable-chips
                hint="Selecciona uno o más roles"
                persistent-hint
              >
                <template #chip="{ props: chipProps, item }">
                  <v-chip
                    v-bind="chipProps"
                    size="small"
                    color="primary"
                    variant="tonal"
                  >
                    {{ ROLE_DEFINITIONS[item]?.label ?? item }}
                  </v-chip>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :title="(ROLE_DEFINITIONS[item as string]?.label ?? item as string)"
                    :subtitle="(ROLE_DEFINITIONS[item as string]?.description ?? '')"
                  />
                </template>
              </v-select>
            </v-col>
          </v-row>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
            <v-btn color="primary" type="submit" :loading="saving">
              {{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
