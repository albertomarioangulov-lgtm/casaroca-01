<script setup lang="ts">
import { z } from 'zod';

interface Emits {
  (e: 'onClose'):void
}

const { login } = useAuthentication()
const isLoading = ref<boolean>(false)
const credentialsError = ref<string | false>(false)
const showPassword = ref<boolean>(false)

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Ingresa un email válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

const state = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const validateField = (field: 'email' | 'password') => {
  const result = loginSchema.shape[field].safeParse(state[field])
  errors[field] = result.success ? '' : result.error.issues[0]?.message || ''
}

const validateLogin = () => {
  errors.email = ''
  errors.password = ''
  credentialsError.value = false

  const result = loginSchema.safeParse(state)
  if (result.success) {
    return true
  }

  result.error.issues.forEach((err: z.ZodIssue) => {
    const field = err.path[0] as 'email' | 'password'
    const message = err.message
    if (field === 'email') errors.email = message
    if (field === 'password') errors.password = message
  })

  return false
}

const dialogError = computed({
  get: () => !!credentialsError.value,
  set: (val: boolean) => {
    if (!val) credentialsError.value = false
  }
})

const onSubmit = async () => {
  if (!validateLogin()) {
    return
  }

  isLoading.value = true
  credentialsError.value = false

  const success = await login(state.email, state.password)
  if (!success) {
    credentialsError.value = 'Email o contraseña incorrectos'
  }

  isLoading.value = false
}
</script>

<template>
  <v-progress-linear
    :active="isLoading"
    :indeterminate="isLoading"
    color="primary"
    height="3"
  ></v-progress-linear>

  <v-form @submit.prevent="onSubmit" class="pa-4 position-relative">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="state.email"
            label="Email"
            type="email"
            density="compact"
            append-inner-icon="mdi-email-outline"
            :error-messages="errors.email"
            :disabled="isLoading"
            @input="errors.email = ''"
            @blur="validateField('email')"
            clearable
          ></v-text-field>
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="state.password"
            label="Contraseña"
            :type="showPassword ? 'text' : 'password'"
            density="compact"
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="errors.password"
            :disabled="isLoading"
            @input="errors.password = ''"
            @blur="validateField('password')"
            @click:append-inner="showPassword = !showPassword"
            clearable
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row class="mt-4 mb-1">
        <v-btn
          block
          type="submit"
          color="orange-darken-1"
          variant="flat"
          size="large"
          :loading="isLoading"
          :disabled="isLoading"
        >
          Iniciar sesión
        </v-btn>
      </v-row>

      <!-- <v-divider class="my-6" color="grey" opacity=".5"></v-divider>

      <v-row align="center" justify="center" class="mb-2">
        <v-col cols="12" class="d-flex justify-center">
          <v-btn
            block
            href="/api/auth/google"
            color="white"
            variant="outlined"
            class="google-signin-btn"
            :disabled="isLoading"
            style="
              color: #3c4043;
              font-weight: 500;
              min-width: 250px;
              max-width: 400px;
            "
          >
            <svg class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Iniciar con Google
          </v-btn>
        </v-col>
      </v-row> -->
    </v-container>
  </v-form>

  <v-dialog
    width="auto"
    v-model="dialogError"
    persistent
  >
    <v-card max-width="400">
      <v-card-text class="pa-0">
        <v-alert
          density="compact"
          variant="tonal"
          border="top"
          type="error"
          title="Error de acceso"
          :text="credentialsError || 'Ocurrió un error al iniciar sesión'"
          closable
          @click:close="credentialsError = false"
        >
          <template v-slot:[`prepend`]>
            <Icon size="2rem" name="line-md:close-circle" />
          </template>
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-center pb-3">
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="credentialsError = false"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>