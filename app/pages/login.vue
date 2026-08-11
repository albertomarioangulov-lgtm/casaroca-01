<script setup lang="ts">

definePageMeta({
  layout: 'login',
  middleware: 'not-authenticated',
})

const { backgroundStyle } = useBackground()
const runConfig  = useRuntimeConfig().public
const clientLogo = ref<any>(runConfig.clientLogo)

</script>

<template>
  <v-container class="fill-height" fluid :style="[backgroundStyle]">
    <v-row align="center" justify="center" class="h-100">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card theme="light" elevation="24" max-width="420" class="mx-auto">
          <v-col cols="12" class="mt-4">
            <!-- <div class="text-center pa-4">
              <p class="font-weight-medium">RocaKids-02</p>
            </div> -->
            <!-- <v-card color="white" class="mx-4 mo-4 "> -->
                  <v-sheet class="d-flex justify-center align-center">
                    <!-- <v-sheet class="ml-0"> -->
                      <!-- <img class="mt-2"
                        height="120"
                        :src="clientLogo"
                      /> -->
                    </v-sheet>
                  
                    <!-- <v-sheet color="#20344C" class="ml-4" width="150">
                      <p class="logo-text text-left font-weight-medium">BOSTON INTERNATIONAL SCHOOL</p>
                    </v-sheet> -->
                  <!-- </v-sheet> -->
                <!-- </v-card> -->
            <v-card color="#243E6F" class="mx-4 mo-4 ">
              <v-sheet color="#243E6F" class="d-flex justify-center align-center">
                  <NuxtImg class="my-4 px-4" height="130"
                    src="/images/crbaq-blanco.svg"
                  />
                </v-sheet>
            </v-card>
            <!-- <template v-if="clientLogo">
  
              <v-card color="blue-darken-3" class="mx-4 mo-4 ">
                <v-sheet color="blue-darken-3" class="d-flex justify-center align-center">
                  <v-sheet color="blue-darken-3" class="ml-0">
                    <img class="mt-2"
                      height="100"
                      :src="clientLogo"
                    />
                  </v-sheet>
                </v-sheet>
              </v-card>
            </template> -->
          </v-col>
          <login-form />
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>