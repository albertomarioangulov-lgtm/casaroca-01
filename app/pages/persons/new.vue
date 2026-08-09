<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

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

const saving = ref(false)
const error = ref('')

const save = async () => {
  saving.value = true
  try {
    const url: string = '/api/persons'
    await $fetch(url, { method: 'POST', body: form.value })
    navigateTo('/persons')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al guardar la persona'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Nueva Persona</h2>
          <p class="text-body-2 text-medium-emphasis">Registre un nuevo miembro de la iglesia</p>
        </div>
        <v-btn variant="text" @click="navigateTo('/persons')">Volver</v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" class="mb-4" :text="error" />

    <v-card>
      <v-card-text>
        <v-form @submit.prevent="save">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.name" label="Nombre completo" required />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.birthDate" label="Fecha de nacimiento" type="date" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.phone" label="Teléfono" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.email" label="Email" type="email" />
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
              />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.address" label="Dirección" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.membershipDate" label="Fecha de membresía (ingreso a la iglesia)" type="date" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.baptismDate" label="Fecha de bautismo" type="date" />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="navigateTo('/persons')">Cancelar</v-btn>
        <v-btn
          v-if="can(PERMISSIONS.PERSONS_CREATE)"
          color="primary"
          :loading="saving"
          @click="save"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>