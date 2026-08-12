// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import { md3 } from 'vuetify/blueprints'

const variant = 'filled'
const density = 'compact'
const hideDetails = 'auto'

const myCustomLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FAFAFA',
    surface: '#ECEFF1',
    'surface-bright': '#FFFFFF',
    'surface-light': '#CFD8DC',
    'surface-variant': '#424242',
    primary: '#1867C0',
    'primary-darken-1': '#1F5592',
    secondary: '#48A9A6',
    'secondary-darken-1': '#018786',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  },
  variables: {
    'border-color': '#000000',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F5F5F5',
    'theme-on-code': '#000000',
  }
}

const myCustomDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    'surface-bright': '#2C2C2C',
    'surface-light': '#2A2A2A',
    'surface-variant': '#BDBDBD',
    primary: '#90CAF9',
    'primary-darken-1': '#64B5F6',
    secondary: '#80CBC4',
    'secondary-darken-1': '#4DB6AC',
    error: '#EF5350',
    info: '#64B5F6',
    success: '#81C784',
    warning: '#FFB74D',
  },
  variables: {
    'border-color': '#FFFFFF',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 1.0,
    'medium-emphasis-opacity': 0.70,
    'disabled-opacity': 0.50,
    'idle-opacity': 0.10,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.16,
    'activated-opacity': 0.14,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#343434',
    'theme-on-code': '#CCCCCC',
  }
}

const myCustomColorfulTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFF8E1',
    surface: '#FFECB3',
    'surface-bright': '#FFFFFF',
    'surface-light': '#FFE082',
    'surface-variant': '#795548',
    primary: '#E91E63',
    'primary-darken-1': '#C2185B',
    secondary: '#FF5722',
    'secondary-darken-1': '#E64A19',
    error: '#F44336',
    info: '#03A9F4',
    success: '#8BC34A',
    warning: '#FF9800',
  },
  variables: {
    'border-color': '#4E342E',
    'border-opacity': 0.16,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#FFF3E0',
    'theme-on-code': '#4E342E',
  }
}

const myCustomNatureTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#E8F5E9',
    surface: '#C8E6C9',
    'surface-bright': '#FFFFFF',
    'surface-light': '#A5D6A7',
    'surface-variant': '#3E2723',
    primary: '#2E7D32',
    'primary-darken-1': '#1B5E20',
    secondary: '#00695C',
    'secondary-darken-1': '#004D40',
    error: '#C62828',
    info: '#1565C0',
    success: '#558B2F',
    warning: '#F9A825',
  },
  variables: {
    'border-color': '#1B5E20',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F1F8E9',
    'theme-on-code': '#1B5E20',
  }
}

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    blueprint: md3,

    defaults: {
      VBtn: {},
      VToolbar: { density },
      VDataTable: { density },
      VDataTableServer: { density },
      VTextField: { variant, density, hideDetails },
      VTextarea: { variant, density, hideDetails },
      VColorInput: { variant, density, hideDetails },
      VDateInput: { variant, density, hideDetails },
      VAutocomplete: { variant, density, hideDetails },
      VCombobox: { variant, density, hideDetails },
      VSelect: { variant, density, hideDetails },
    },

    theme: {
      defaultTheme: 'myCustomLightTheme',
      themes: {
        myCustomLightTheme,
        myCustomDarkTheme,
        myCustomColorfulTheme,
        myCustomNatureTheme,
      },
    },
    
  })
  app.vueApp.use(vuetify)
})