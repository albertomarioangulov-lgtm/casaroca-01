<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { can, PERMISSIONS } = usePermissions()

// Selectores
const periods = [
  { title: 'Últimos 3 meses', value: 3 },
  { title: 'Últimos 6 meses', value: 6 },
  { title: 'Últimos 12 meses', value: 12 },
]
const periodMonths = ref(6)
const ministryId = ref('')
const ministries = ref<Record<string, any>[]>([])

// Estado
const loading = ref(false)
const error = ref('')
const report = ref<{ total: any[]; mensual: any[]; eventos: number }>({ total: [], mensual: [], eventos: 0 })
const noData = ref(false)

// Cargar ministerios para el selector
const fetchMinistries = async () => {
  try {
    const data = await $fetch('/api/ministries') as any
    ministries.value = data.items ?? []
  } catch {
    ministries.value = []
  }
}

// Construir el rango de fechas
const buildRange = () => {
  const now = new Date()
  const hasta = now
  const desde = new Date(now.getFullYear(), now.getMonth() - periodMonths.value, 1)
  return { desde, hasta }
}

// Formato YYYY-MM
const fmtMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

// Paleta de colores para salones
const palette = [
  '#5C6BC0', '#26A69A', '#FFA726', '#EF5350', '#AB47BC',
  '#7CB342', '#29B6F6', '#FF7043', '#66BB6A', '#8D6E63',
]
const colorFor = (index: number) => palette[index % palette.length]

const fetchReport = async () => {
  loading.value = true
  error.value = ''
  noData.value = false
  try {
    const { desde, hasta } = buildRange()
    const params: Record<string, any> = {
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      granularity: 'mensual',
    }
    if (ministryId.value) params.ministryId = ministryId.value
    const data = await $fetch('/api/reports/age-groups', { params }) as any
    report.value = data ?? { total: [], mensual: [], eventos: 0 }
    noData.value = report.value.total.length === 0
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Error al generar el reporte'
  } finally {
    loading.value = false
  }
}

// ---- Datos para los gráficos (client-only) ----

// Torta: distribución total por rango
const doughnutData = computed(() => {
  const total = report.value.total ?? []
  return {
    labels: total.map((t: any) => `${t.name}${t.minAge !== null && t.maxAge !== null ? ` (${t.minAge}-${t.maxAge})` : ''}`),
    datasets: [{
      data: total.map((t: any) => t.cantidad),
      backgroundColor: total.map((_: any, i: number) => colorFor(i)),
    }],
  }
})
const doughnutTotal = computed(() => (report.value.total ?? []).reduce((s: number, t: any) => s + t.cantidad, 0))

// Barras: asistencias por rango, agrupadas por mes
const barLabels = computed(() => (report.value.mensual ?? []).map((m: any) => m.mes))
const barRanges = computed(() => {
  const all = new Map<string, { name: string; minAge: number | null; maxAge: number | null }>()
  for (const m of report.value.mensual ?? []) {
    for (const r of m.rangos ?? []) {
      if (!all.has(r.name)) all.set(r.name, { name: r.name, minAge: r.minAge, maxAge: r.maxAge })
    }
  }
  return Array.from(all.values())
})
const barDatasets = computed(() => {
  const meses = report.value.mensual ?? []
  return barRanges.value.map((r, i) => ({
    label: r.name,
    data: meses.map((m: any) => (m.rangos ?? []).find((x: any) => x.name === r.name)?.cantidad ?? 0),
    backgroundColor: colorFor(i),
  }))
})

const refresh = () => {
  if (can(PERMISSIONS.CHECKINS_READ)) fetchReport()
}

onMounted(async () => {
  await fetchMinistries()
  refresh()
})
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h5">Reporte por rangos de edad</h2>
          <p class="text-body-2 text-medium-emphasis">
            Asistencia agrupada por salón/rango de edad usando la configuración histórica de cada evento.
          </p>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <v-select
          v-model="periodMonths"
          label="Período"
          :items="periods"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="5">
        <v-select
          v-model="ministryId"
          label="Ministerio (todos)"
          :items="ministries"
          item-title="name"
          item-value="id"
          clearable
          density="compact"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-btn color="primary" :loading="loading" @click="refresh">
          Generar reporte
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>
    <v-alert v-if="noData && !loading" type="info" class="mb-4">
      No hay check-ins en el período seleccionado.
    </v-alert>

    <v-row v-if="!noData && !loading">
      <!-- Gráfico de torta: distribución total -->
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Distribución total ({{ doughnutTotal }} niños)
          </v-card-title>
          <v-card-text>
            <ClientOnly>
              <ReportsDoughnut :data="doughnutData" />
            </ClientOnly>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Gráfico de barras: por mes -->
      <v-col cols="12" md="7">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Asistencia por rango y mes
          </v-card-title>
          <v-card-text>
            <ClientOnly>
              <ReportsBar :labels="barLabels" :datasets="barDatasets" />
            </ClientOnly>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>