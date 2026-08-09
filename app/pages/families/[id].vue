<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const familyId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const family = ref<Record<string, any> | null>(null)
const loading = ref(true)
const error = ref('')

// Roles estandarizados de familia
const familyRoleOptions = [
  { title: 'Padre', value: 'padre' },
  { title: 'Madre', value: 'madre' },
  { title: 'Hijo', value: 'hijo' },
  { title: 'Hija', value: 'hija' },
  { title: 'Hermano', value: 'hermano' },
  { title: 'Hermana', value: 'hermana' },
  { title: 'Abuelo', value: 'abuelo' },
  { title: 'Abuela', value: 'abuela' },
  { title: 'Tío', value: 'tio' },
  { title: 'Tía', value: 'tia' },
  { title: 'Sobrino', value: 'sobrino' },
  { title: 'Sobrina', value: 'sobrina' },
  { title: 'Nieto', value: 'nieto' },
  { title: 'Nieta', value: 'nieta' },
  { title: 'Primo', value: 'primo' },
  { title: 'Prima', value: 'prima' },
  { title: 'Cuñado', value: 'cuñado' },
  { title: 'Cuñada', value: 'cuñada' },
  { title: 'Yerno', value: 'yerno' },
  { title: 'Nuera', value: 'nuera' },
  { title: 'Miembro del hogar', value: 'miembro' },
  { title: 'Otro', value: 'otro' },
]

// Diálogo agregar miembro
const memberDialog = ref(false)
const memberForm = ref<Record<string, any>>({
  personId: '',
  name: '',
  roleInFamily: '',
})
const persons = ref<Record<string, any>[]>([])

const fetchFamily = async () => {
  loading.value = true
  try {
    const url: string = `/api/families/${familyId}`
    family.value = await $fetch(url)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al cargar la familia'
  } finally {
    loading.value = false
  }
}

const fetchPersons = async () => {
  try {
    const url: string = '/api/persons?limit=100'
    const data = await $fetch(url) as any
    persons.value = data?.items ?? []
  } catch (e: any) {
    console.error('Error fetching persons:', e)
  }
}

onMounted(async () => {
  await fetchFamily()
  await fetchPersons()
})

const openAddMember = () => {
  memberForm.value = { personId: '', name: '', roleInFamily: '' }
  memberDialog.value = true
}

const addMember = async () => {
  try {
    const url: string = `/api/families/${familyId}/members`
    await $fetch(url, {
      method: 'POST',
      body: {
        personId: memberForm.value.personId || undefined,
        name: memberForm.value.name || undefined,
        roleInFamily: memberForm.value.roleInFamily || 'miembro',
      },
    })
    memberDialog.value = false
    await fetchFamily()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al agregar el miembro')
  }
}

const removeMember = async (member: Record<string, any>) => {
  if (!confirm(`¿Quitar a ${member.name} de la familia ${family.value?.name}?`)) return
  try {
    const url: string = `/api/families/${familyId}/members/${member.personId}`
    await $fetch(url, { method: 'DELETE' })
    await fetchFamily()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al quitar el miembro')
  }
}
</script>

<template>
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else-if="error">
    <v-alert type="error" :text="error" />
  </div>

  <div v-else-if="family">
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">
            <v-icon class="mr-2">mdi-home-group</v-icon>
            {{ family.name }}
          </h2>
          <p class="text-body-2 text-medium-emphasis">
            {{ family.members?.length ?? 0 }} miembros en el hogar
          </p>
        </div>
        <div>
          <v-btn
            v-if="can(PERMISSIONS.FAMILIES_UPDATE)"
            color="primary"
            prepend-icon="mdi-account-plus"
            class="mr-2"
            @click="openAddMember"
          >
            Agregar miembro
          </v-btn>
          <v-btn variant="text" @click="navigateTo('/families')">Volver</v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Miembros -->
    <v-row>
      <v-col
        v-for="m in family.members"
        :key="m.personId"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="h-100" variant="tonal">
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" variant="tonal" size="48" class="mr-3">
              <span class="text-h6">{{ m.name?.charAt(0) || '?' }}</span>
            </v-avatar>
            <div class="flex-grow-1">
              <a
                class="text-subtitle-1 font-weight-medium cursor-pointer"
                @click="navigateTo(`/persons/${m.personId}`)"
              >
                {{ m.name }}
              </a>
              <div class="text-body-2 text-medium-emphasis">
                <v-chip size="x-small" variant="tonal" class="mr-1">
                  {{ m.roleInFamily || 'miembro' }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                <template v-if="m.phone">📞 {{ m.phone }}</template>
                <template v-else-if="m.email">✉️ {{ m.email }}</template>
                <template v-else>—</template>
              </div>
            </div>
            <v-btn
              v-if="can(PERMISSIONS.FAMILIES_UPDATE)"
              size="small"
              variant="text"
              icon="mdi-close"
              @click="removeMember(m)"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="!family.members?.length">
      <v-col cols="12" class="text-center py-8 text-medium-emphasis">
        Esta familia no tiene miembros. Agrega el primero.
      </v-col>
    </v-row>

    <!-- Diálogo agregar miembro -->
    <v-dialog v-model="memberDialog" max-width="500">
      <v-card>
        <v-card-title>Agregar miembro a la familia</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addMember">
            <v-autocomplete
              v-model="memberForm.personId"
              label="Persona existente"
              :items="persons"
              item-title="name"
              item-value="id"
              clearable
            />
            <v-text-field
              v-if="!memberForm.personId"
              v-model="memberForm.name"
              label="O crear nueva persona (nombre)"
            />
            <v-select
              v-model="memberForm.roleInFamily"
              label="Rol en la familia"
              :items="familyRoleOptions"
              item-title="title"
              item-value="value"
              clearable
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="memberDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="addMember">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>