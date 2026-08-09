export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn } = useAuthentication()

  if (!isLoggedIn.value) {
    return navigateTo('/login?message=Please login to access the dashboard')
  }
})