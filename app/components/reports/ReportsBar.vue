<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps<{
  labels: string[]
  datasets: any[]
}>()

const options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
}
</script>

<template>
  <div style="height: 320px">
    <Bar :data="{ labels: props.labels, datasets: props.datasets }" :options="options" />
  </div>
</template>