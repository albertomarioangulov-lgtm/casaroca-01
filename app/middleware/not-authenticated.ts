export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useAuthentication()

  if(to.path.startsWith('/login') && isLoggedIn.value) {
    return navigateTo('/?message=You are already logged in')
  }
  if(to.path.startsWith('/register') && isLoggedIn.value) {
    return navigateTo('/?message=You are already logged in')
  }
})
