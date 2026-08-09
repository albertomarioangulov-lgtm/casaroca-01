import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    plugins: [
      vuetify({ autoImport: true }),
    ],
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },

  modules: ['@nuxt/icon', '@nuxt/image', 'nuxt-auth-utils'],

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI,
    mongodbName: process.env.MONGODB_NAME,
    mongooseUri: process.env.MONGODB_URI,
    googleClientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
    
    public: {
      clientLogo: process.env.CLIENT_LOGO,
    }
  },

  imports: {
    dirs: [
      'composables/*/*.{ts,js,mjs,mts}',
    ]
  },
  routeRules: {
    '/api/**': { cors: true }
  },
})