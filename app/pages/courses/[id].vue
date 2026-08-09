<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const courseId = route.params.id as string

const { can, PERMISSIONS } = usePermissions()

const course = ref<Record<string, any> | null>(null)
const loading = ref(true)
const error = ref('')
const sessionDialog = ref(false)
const sessionForm = ref<Record<string, any>>({ date: '', topic: '', location: '' })
const enrollmentDialog = ref(false)
const enrollmentPersonId = ref('')
const persons = ref<Record<string, any>[]>([])

const fetchCourse = async () => {
  loading.value = true
  try {
    const url: string = `/api/courses/${courseId}`
    course.value = await $fetch(url)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al cargar el curso'
  } finally {
    loading.value = false
  }
}

const fetchPersons = async () => {
  const data = await $fetch('/api/persons', { query: { limit: 100 } })
  persons.value = data.items ?? []
}

onMounted(async () => {
  await fetchCourse()
  await fetchPersons()
})

const addSession = async () => {
  try {
    const url: string = `/api/courses/${courseId}/sessions`
    await $fetch(url, { method: 'POST', body: sessionForm.value })
    sessionDialog.value = false
    sessionForm.value = { date: '', topic: '', location: '' }
    await fetchCourse()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al crear la sesión')
  }
}

const addEnrollment = async () => {
  try {
    const url: string = `/api/course-enrollments`
    await $fetch(url, {
      method: 'POST',
      body: { courseId, personId: enrollmentPersonId.value },
    })
    enrollmentDialog.value = false
    enrollmentPersonId.value = ''
    await fetchCourse()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al crear la solicitud')
  }
}

const decideEnrollment = async (enrollment: Record<string, any>, status: string) => {
  try {
    const url: string = `/api/course-enrollments/${enrollment.id}`
    await $fetch(url, { method: 'PUT', body: { status } })
    await fetchCourse()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Error al decidir la solicitud')
  }
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    cancelled: 'Cancelada',
    draft: 'Borrador',
    active: 'Activo',
    finished: 'Finalizado',
  }
  return map[status] ?? status
}
</script>

<template>
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <div v-else-if="error">
    <v-alert type="error" :text="error" />
  </div>

  <div v-else-if="course">
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">{{ course.name }}</h2>
          <p class="text-body-2 text-medium-emphasis">
            {{ course.ministryName ? `Ministerio: ${course.ministryName}` : 'Curso general' }}
            · {{ statusLabel(course.status) }}
          </p>
        </div>
        <v-btn variant="text" @click="navigateTo('/courses')">Volver</v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center justify-space-between">
            Sesiones
            <v-btn
              v-if="can(PERMISSIONS.COURSES_UPDATE)"
              size="small"
              color="primary"
              @click="sessionDialog = true"
            >
              Agregar
            </v-btn>
          </v-card-title>
          <v-card-text>
            <template v-if="course.sessions?.length">
              <v-list density="compact">
                <v-list-item v-for="s in course.sessions" :key="s.id">
                  <template #prepend><v-icon>mdi-calendar</v-icon></template>
                  <v-list-item-title>
                    {{ s.date ? new Date(s.date).toLocaleDateString() : '' }}
                    <span v-if="s.topic"> · {{ s.topic }}</span>
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="s.location">{{ s.location }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <span v-else class="text-medium-emphasis">Sin sesiones registradas</span>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            Solicitudes de inscripción
            <v-btn
              v-if="can(PERMISSIONS.COURSE_ENROLLMENTS_CREATE)"
              size="small"
              color="primary"
              @click="enrollmentDialog = true"
            >
              Solicitar
            </v-btn>
          </v-card-title>
          <v-card-text>
            <template v-if="course.enrollments?.length">
              <v-list density="compact">
                <v-list-item v-for="e in course.enrollments" :key="e.id">
                  <template #prepend><v-icon>mdi-account</v-icon></template>
                  <v-list-item-title>{{ e.personName }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ statusLabel(e.status) }}
                    <span v-if="e.requestDate"> · {{ new Date(e.requestDate).toLocaleDateString() }}</span>
                  </v-list-item-subtitle>
                  <template #append>
                    <template v-if="e.status === 'pending' && can(PERMISSIONS.COURSE_ENROLLMENTS_UPDATE)">
                      <v-btn size="x-small" color="success" variant="tonal" class="mr-1" @click="decideEnrollment(e, 'approved')">
                        Aprobar
                      </v-btn>
                      <v-btn size="x-small" color="error" variant="tonal" @click="decideEnrollment(e, 'rejected')">
                        Rechazar
                      </v-btn>
                    </template>
                  </template>
                </v-list-item>
              </v-list>
            </template>
            <span v-else class="text-medium-emphasis">Sin solicitudes</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo agregar sesión -->
    <v-dialog v-model="sessionDialog" max-width="500">
      <v-card>
        <v-card-title>Nueva Sesión</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addSession">
            <v-text-field v-model="sessionForm.date" label="Fecha" type="date" required />
            <v-text-field v-model="sessionForm.topic" label="Tema" />
            <v-text-field v-model="sessionForm.location" label="Lugar" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="sessionDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="addSession">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo solicitar inscripción -->
    <v-dialog v-model="enrollmentDialog" max-width="500">
      <v-card>
        <v-card-title>Solicitar inscripción</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="addEnrollment">
            <v-autocomplete
              v-model="enrollmentPersonId"
              label="Persona"
              :items="persons"
              item-title="name"
              item-value="id"
              required
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="enrollmentDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="addEnrollment">Solicitar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>