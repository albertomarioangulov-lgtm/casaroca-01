import { User } from "~~/server/models/User";

export default defineOAuthGoogleEventHandler({
  config: {
    clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
  },
  async onSuccess(event, { user: googleUser }) {
    try {
      // 1. Buscar o crear usuario en MongoDB
      let user = await User.findOne({ email: googleUser.email });
      
      if (!user) {
        user = await User.create({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          googleId: googleUser.sub
        });
      }

      // 2. Establecer la sesión de Nuxt
      await setUserSession(event, {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name ?? undefined,
          roles: user.roles ?? []
        }
      });

      return sendRedirect(event, '/');
    } catch (error) {
      console.error('Google OAuth onSuccess Error:', error);
      return sendRedirect(event, '/login?error=Error al procesar autenticación con Google');
    }
  },
  async onError(event, error) {
    console.error('Google OAuth Error:', error);
    return sendRedirect(event, '/login?error=Google authentication failed');
  }
});
