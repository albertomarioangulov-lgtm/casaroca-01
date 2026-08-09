import { z } from 'zod'
import { User } from '~~/server/models/User'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Login validation failed',
        data: result.error.flatten().fieldErrors,
      })
    }

    const { email, password } = result.data

    const user = await User.findOne({ email })
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Email o contraseña incorrectos',
      })
    }

    // Si el usuario fue creado con Google OAuth, no tiene contraseña
    if (!user.password) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Esta cuenta fue creada con Google. Inicia sesión con Google.',
      })
    }

    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Email o contraseña incorrectos',
      })
    }

    await setUserSession(event, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles ?? [],
      },
    })

    return {
      success: true,
    }
  } catch (error: any) {
    // Si ya es un error HTTP controlado, lo relanzamos
    if (error.statusCode) {
      throw error
    }
    
    // Error inesperado (base de datos caída, etc.)
    console.error('Login error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error interno del servidor. Intenta de nuevo más tarde.',
    })
  }
})
