import { ref } from 'vue'

export const useWelcomeCardFollowUp = (cardId: string) => {
  const loading = ref(false)
  const error = ref('')
  const data = ref<Record<string, any> | null>(null)

  const fetchFollowUp = async () => {
    error.value = ''
    loading.value = true
    try {
      const result = await $fetch(`/api/welcome-cards/${cardId}/follow-up`) as any
      data.value = result
    } catch (err: any) {
      error.value = err?.data?.statusMessage || 'Error al cargar el seguimiento'
    } finally {
      loading.value = false
    }
  }

  const addContact = async (payload: Record<string, any>) => {
    error.value = ''
    try {
      await $fetch(`/api/welcome-cards/${cardId}/follow-up/contacts`, {
        method: 'POST' as any,
        body: payload,
      })
      await fetchFollowUp()
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || 'Error al registrar el contacto'
      return false
    }
  }

  const updateStatus = async (status: string, reason?: string) => {
    error.value = ''
    try {
      await $fetch(`/api/welcome-cards/${cardId}/follow-up/status`, {
        method: 'PUT',
        body: { status, reason: reason || undefined },
      })
      await fetchFollowUp()
      return true
    } catch (err: any) {
      error.value = err?.data?.statusMessage || 'Error al actualizar el estado'
      return false
    }
  }

  return {
    loading,
    error,
    data,
    fetchFollowUp,
    addContact,
    updateStatus,
  }
}