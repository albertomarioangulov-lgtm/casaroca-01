import { z } from 'zod'
import { User } from '~~/server/models/User'
import { PERMISSIONS } from '~~/shared/permissions'
import { requirePermission } from '~~/server/utils/permissions'

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
  roles: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.USERS_UPDATE)

  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de usuario no proporcionado',
    })
  }

  const body = await readBody(event)
  const result = updateUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validación de usuario fallida',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { name, email, password, roles } = result.data

  const user = await User.findById(id)
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuario no encontrado',
    })
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'El correo ya está registrado',
      })
    }
    user.email = email
  }

  if (name) user.name = name
  if (password) user.password = await User.encryptPassword(password)
  
  if (roles) {
    const roleList = roles.split(',').map((role) => role.trim()).filter(Boolean)
    user.roles = roleList
  }

  await user.save()

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
})
