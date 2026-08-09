<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const caregiverId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const loading = ref(true)
const error = ref('')
const caregiver = ref<Record<string, any> | null>(null)

const fetchCaregiver = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch(`/api/caregivers/${caregiverId}`) as any
    caregiver.value = result
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Error al cargar el acudiente'
  } finally {
    loading.value = false
  }
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
    return ` · ${months} meses`
  }
  return ` · ${age} años`
}

onMounted(() => {
  if (can(PERMISSIONS.CAREGIVERS_READ)) {
    fetchCaregiver()
  }
})
</script>

<template>
  <template v-if="can(PERMISSIONS.CAREGIVERS_READ)">
    <v-btn
      variant="text"
      color="primary"
      prepend-icon="mdi-arrow-left"
      class="mb-2"
      @click="navigateTo('/caregivers')"
    >
      Volver a acudientes
    </v-btn>

    <v-alert v-if="error" type="error" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="caregiver">
      <h2 class="text-h6 font-weight-bold mb-4">
        Hoja de vida · {{ caregiver.name }}
      </h2>

      <v-card class="mb-6">
        <v-card-item>
          <v-card-title class="text-body-1 font-weight-bold">
            {{ caregiver.name }}
          </v-card-title>
          <v-card-subtitle>
            <template v-if="caregiver.phone">📞 {{ caregiver.phone }}</template>
            <template v-else>Sin teléfono</template>
          </v-card-subtitle>
        </v-card-item>
      </v-card>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Niños asociados ({{ caregiver.children?.length || 0 }})
      </h3>

      <div v-if="!caregiver.children?.length" class="text-medium-emphasis mb-4">
        Este acudiente no tiene niños asociados.
      </div>

      <v-row v-else dense>
        <v-col
          v-for="child in caregiver.children"
          :key="child.id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card class="mb-2" hover>
            <v-card-item>
              <v-card-title class="text-body-1 font-weight-bold">
                {{ child.name }}
                <v-chip
                  v-if="child.relationshipToCaregiver"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  class="ml-1"
                >
                  {{ child.relationshipToCaregiver }}
                </v-chip>
              </v-card-title>
              <v-card-subtitle>
                {{ child.birthDate ? new Date(child.birthDate).toLocaleDateString() : 'Sin fecha' }}
                {{ child.birthDate ? calculateAge(child.birthDate) : '' }}
              </v-card-subtitle>
            </v-card-item>

            <v-card-text class="pt-0 text-caption">
              <div v-if="child.otherCaregivers?.length" class="mt-1">
                <div class="text-subtitle-2 font-weight-medium mb-1">Red familiar:</div>
                <v-chip
                  v-for="cg in child.otherCaregivers"
                  :key="cg.id"
                  size="small"
                  variant="tonal"
                  class="mr-1 mb-1"
                  :color="'grey'"
                  @click="navigateTo(`/caregivers/${cg.id}`)"
                >
                  👤 {{ cg.name }}
                  <template v-if="cg.relationship"> ({{ cg.relationship }})</template>
                </v-chip>
              </div>
              <div v-else class="text-medium-emphasis">
                Sin otros acudientes asociados
              </div>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                color="green"
                prepend-icon="mdi-eye"
                @click="navigateTo(`/children/${child.id}`)"
              >
                Ver niño
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </template>
  <template v-else>
    <v-alert type="warning" title="Acceso denegado" text="No tienes permisos para acceder a esta página." />
  </template>
</template>