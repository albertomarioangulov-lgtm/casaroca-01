import { useTheme } from 'vuetify'

export interface ThemeOption {
  id: string
  label: string
  icon: string
}

export const useThemeToggle = () => {
  const vuetifyTheme = useTheme()

  const themes: ThemeOption[] = [
    { id: 'myCustomLightTheme', label: 'Claro', icon: 'mdi-weather-sunny' },
    { id: 'myCustomDarkTheme', label: 'Oscuro', icon: 'mdi-weather-night' },
    { id: 'myCustomColorfulTheme', label: 'Colorido', icon: 'mdi-palette' },
    { id: 'myCustomNatureTheme', label: 'Naturaleza', icon: 'mdi-leaf' },
  ]

  const currentThemeId = computed(() => vuetifyTheme.global.name.value)

  const currentTheme = computed((): ThemeOption =>
    themes.find(t => t.id === currentThemeId.value) || themes[0]
  )

  const initTheme = () => {
    const savedTheme = localStorage.getItem('rocakids-theme')
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      vuetifyTheme.change(savedTheme)
    }
  }

  const setTheme = (themeId: string) => {
    vuetifyTheme.change(themeId)
    localStorage.setItem('rocakids-theme', themeId)
  }

  // Initialize on first call
  if (process.client) {
    initTheme()
  }

  return {
    themes,
    currentTheme,
    currentThemeId,
    setTheme,
    themeIcon: computed(() => currentTheme.value.icon),
    themeTooltip: computed(() => currentTheme.value.label),
  }
}
