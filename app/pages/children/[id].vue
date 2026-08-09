<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const childId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const loading = ref(true)
const error = ref('')
const child = ref<Record<string, any> | null>(null)
const addCaregiverFormRef = ref<any>(null)

const fetchChild = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch(`/api/children/${childId}`) as any
    child.value = result
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al cargar el niño'
  } finally {
    loading.value = false
  }
}

const openAddCaregiver = () => {
  addCaregiverFormRef.value?.open()
}

const calculateAge = (birthDate: string | null): string => {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  if (age < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return `${months} meses`
  }
  return `${age} años`
}

onMounted(() => {
  if (can(PERMISSIONS.CHILDREN_READ)) {
    fetchChild()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.CHILDREN_READ)">
    <v-btn
      variant="text"
      color="primary"
      prepend-icon="mdi-arrow-left"
      class="mb-2"
      @click="navigateTo('/children')"
    >
      Volver a niños
    </v-btn>

    <v-alert v-if="error" type="error" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="child">
      <h2 class="text-h6 font-weight-bold mb-4">
        Hoja de vida · {{ child.name }}
      </h2>

      <v-card class="mb-6">
        <v-card-item>
          <v-card-title class="text-body-1 font-weight-bold">
            {{ child.name }}
          </v-card-title>
          <v-card-subtitle>
            <template v-if="child.birthDate">
              Nacimiento: {{ new Date(child.birthDate).toLocaleDateString() }} · {{ calculateAge(child.birthDate) }}
            </template>
            <template v-else>
              Sin fecha de nacimiento
            </template>
          </v-card-subtitle>
        </v-card-item>
      </v-card>

      <!-- ===== Acudientes asociados ===== -->
      <div class="d-flex align-center mb-2">
        <h3 class="text-subtitle-1 font-weight-bold">
          Acudientes asociados ({{ child.caregivers?.length || 0 }})
        </h3>
        <v-spacer />
        <v-btn
          v-if="can(PERMISSIONS.CHILDREN_UPDATE)"
          size="small"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-account-plus"
          @click="openAddCaregiver"
        >
          Agregar acudiente
        </v-btn>
      </div>

      <div v-if="!child.caregivers?.length" class="text-medium-emphasis mb-6">
        Este niño no tiene acudientes asociados.
      </div>

      <div v-else class="mb-6">
        <v-row dense>
          <v-col
            v-for="cg in child.caregivers"
            :key="cg.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card class="mb-2" hover>
              <v-card-item>
                <v-card-title class="text-body-1 font-weight-bold">
                  {{ cg.name }}
                  <v-chip
                    v-if="cg.relationship"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="ml-1"
                  >
                    {{ cg.relationship }}
                  </v-chip>
                </v-card-title>
                <v-card-subtitle>
                  <template v-if="cg.phone">📞 {{ cg.phone }}</template>
                  <template v-else>Sin teléfono</template>
                </v-card-subtitle>
              </v-card-item>
              <v-card-actions>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  color="blue"
                  prepend-icon="mdi-eye"
                  @click="navigateTo(`/caregivers/${cg.id}`)"
                >
                  Ver acudiente
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ===== Historial de eventos ===== -->
      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Historial de eventos ({{ child.history?.length || 0 }})
      </h3>

      <div v-if="!child.history?.length" class="text-medium-emphasis">
        Este niño aún no ha asistido a ningún evento.
      </div>

      <v-table v-else density="comfortable">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Fecha</th>
            <th>Manilla</th>
            <th>Acudiente</th>
            <th>Ingreso</th>
            <th>Salida</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in child.history" :key="item.id">
            <td>{{ item.eventName || '—' }}</td>
            <td>{{ item.eventDate ? new Date(item.eventDate).toLocaleDateString() : '—' }}</td>
            <td>{{ item.wristbandNumber }}</td>
            <td>{{ item.caregiver?.name || '—' }}</td>
            <td>{{ item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—' }}</td>
            <td>
              <template v-if="item.checkOutTime">
                {{ new Date(item.checkOutTime).toLocaleTimeString() }}
              </template>
              <v-chip v-else size="x-small" color="green" variant="tonal">
                Dentro
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
      <ChildrenAddCaregiverForm ref="addCaregiverFormRef" :child-id="childId" @saved="fetchChild" />
    </template>
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>
