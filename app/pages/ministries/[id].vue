<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const ministryId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const ministry = ref<Record<string, any> | null>(null)
const loading = ref(true)
const error = ref('')
const memberships = ref<Record<string, any>[]>([])
const dialog = ref(false)
const form = ref<Record<string, any>>({
  personId: '',
  roleInMinistry: 'member',
  specialties: [],
})
const persons = ref<Record<string, any>[]>([])

const fetchMinistry = async () => {
  loading.value = true
  try {
    const url: string = `/api/ministries/${ministryId}`
    ministry.value = await $fetch(url)
    const membershipsUrl: string = `/api/ministry-memberships?ministryId=${ministryId}`
    const membershipsData = await $fetch(membershipsUrl) as any
    memberships.value = membershipsData?.items ?? []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al cargar el ministerio'
  } finally {
    loading.value = false
  }
}

const fetchMinistryPersons = async () => {
  try {
    const personsUrl: string = `/api/persons?limit=100`
    const data = await $fetch(personsUrl) as any
    persons.value = data?.items ?? []
  } catch (e: any) {
    console.error('Error fetching persons:', e)
  }
}

onMounted(async () => {
  await fetchMinistry()
  await fetchMinistryPersons()
})

const openAddMembership = () => {
  form.value = { personId: '', roleInMinistry: 'member', specialties: [] }
  dialog.value = true
}

const addMembership = async () => {
  try {
    const membershipsUrl: string = '/api/ministry-memberships'
    await $fetch(membershipsUrl, {
      method: 'POST',
      body: { ...form.value, ministryId },
    })
    dialog.value = false
    await Promise.all([fetchMinistry(), fetchMinistryPersons()])
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al vincular la persona')
  }
}

const removeMembership = async (m: Record<string, any>) => {
  if (!confirm(`¿Quitar a ${m.personName} del ministerio?`)) return
  try {
    const url: string = `/api/ministry-memberships/${m.id}`
    await $fetch(url, { method: 'DELETE' })
    await fetchMinistry()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al quitar la membresía')
  }
}

const roleLabel = (role: string) => {
  const map: Record<string, string> = { member: 'Miembro', leader: 'Líder', director: 'Director' }
  return map[role] ?? role
}
</script>

<template>
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else-if="error">
    <v-alert type="error" :text="error" />
  </div>

  <div v-else-if="ministry">
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">
            <v-icon class="mr-2">{{ ministry.icon || 'mdi-church-outline' }}</v-icon>
            {{ ministry.name }}
          </h2>
          <p class="text-body-2 text-medium-emphasis">
            {{ ministry.memberCount }} miembros · {{ ministry.leaderCount }} líderes
          </p>
        </div>
        <div>
          <v-btn
            v-if="can(PERMISSIONS.MEMBERSHIPS_CREATE)"
            color="primary"
            prepend-icon="mdi-account-plus"
            class="mr-2"
            @click="openAddMembership"
          >
            Vincular persona
          </v-btn>
          <v-btn variant="text" @click="navigateTo('/ministries')">Volver</v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>Elegibilidad</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Tipo: {{ ministry.eligibilityType }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="ministry.eligibilityType === 'age'">
                <v-list-item-title>Edad: {{ ministry.minAge }} - {{ ministry.maxAge }} años</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="ministry.eligibilityType === 'gender'">
                <v-list-item-title>Género: {{ ministry.gender === 'male' ? 'Hombres' : 'Mujeres' }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="ministry.eligibilityType === 'marital'">
                <v-list-item-title>Estado civil: {{ ministry.maritalStatus }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Funciones del ministerio</v-card-title>
          <v-card-text>
            <template v-if="ministry.roles?.length">
              <v-chip
                v-for="r in ministry.roles"
                :key="r.id"
                class="mr-2 mb-2"
                variant="tonal"
              >
                {{ r.name }}
              </v-chip>
            </template>
            <span v-else class="text-medium-emphasis">Sin funciones definidas</span>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Miembros vinculados</v-card-title>
          <v-card-text>
            <template v-if="memberships.length">
              <v-list>
                <v-list-item
                  v-for="m in memberships"
                  :key="m.id"
                >
                  <template #prepend>
                    <v-avatar color="primary" variant="tonal">
                      <span>{{ m.personName?.charAt(0) || '?' }}</span>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ m.personName }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ roleLabel(m.roleInMinistry) }}
                    <span v-if="m.source === 'invitation'"> · por invitación</span>
                    <span v-if="m.joinedAt"> · desde {{ new Date(m.joinedAt).toLocaleDateString() }}</span>
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      v-if="can(PERMISSIONS.MEMBERSHIPS_DELETE)"
                      size="small"
                      variant="text"
                      icon="mdi-delete"
                      @click="removeMembership(m)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </template>
            <span v-else class="text-medium-emphasis">Sin miembros vinculados</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo vincular persona -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>Vincular persona al ministerio</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addMembership">
            <v-autocomplete
              v-model="form.personId"
              label="Persona"
              :items="persons"
              item-title="name"
              item-value="id"
              required
            />
            <v-select
              v-model="form.roleInMinistry"
              label="Rol"
              :items="[
                { title: 'Miembro', value: 'member' },
                { title: 'Líder', value: 'leader' },
                { title: 'Director', value: 'director' },
              ]"
              item-title="title"
              item-value="value"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="addMembership">Vincular</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>