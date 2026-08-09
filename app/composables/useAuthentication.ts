export const useAuthentication = () => {
  const { fetch, user, loggedIn, clear, session } = useUserSession()

  const login = async (email: string, password: string) => {
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      await fetch()
      navigateTo('/?message=Login successful')

      return true
    } catch (error: any) {
      return false
    }
  }

  const register = async (fullName: string,email: string, password: string) => {
   
      // navigateTo('/?message=Registration successful')

      return true
    
  }

  const logout = async () => {
    await clear()
    await navigateTo('/?message=Logout successful')
  }

  return {
    loggedIn,
    session,
    user,

    isLoggedIn: loggedIn,
    isAdmin: computed(() => user.value?.roles?.includes('admin') ?? false),

    fetch,
    login,
    register,
    logout,
  }
}