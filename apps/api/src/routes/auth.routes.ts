import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { registerSchema, loginSchema, refreshTokenSchema } from '@beauty/shared'
import {
  register,
  login,
  refresh,
  hashPassword,
  type UserRecord,
} from '../services/auth.service'

const inMemoryUsers: Map<string, UserRecord & { email?: string }> = new Map()

const findUser = async (phone: string): Promise<UserRecord | null> =>
  inMemoryUsers.get(phone) ?? null

const createUser = async (data: {
  phone: string
  passwordHash: string
  firstName: string
  lastName: string
}): Promise<UserRecord> => {
  const user: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    phone: data.phone,
    passwordHash: data.passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    tariff: 'free',
    isBlocked: false,
  }
  inMemoryUsers.set(data.phone, user)
  return user
}

export const authRoutes = new Hono()

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const tokens = await register(body, findUser, createUser)
    return c.json({ success: true, data: tokens }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'REGISTER_ERROR'
    if (msg === 'USER_ALREADY_EXISTS') {
      return c.json({ success: false, error: 'Пользователь с этим номером уже существует', code: msg }, 409)
    }
    return c.json({ success: false, error: 'Ошибка регистрации', code: msg }, 500)
  }
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { phone, password } = c.req.valid('json')
  try {
    const tokens = await login(phone, password, findUser)
    return c.json({ success: true, data: tokens })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LOGIN_ERROR'
    if (msg === 'INVALID_CREDENTIALS') {
      return c.json({ success: false, error: 'Неверный номер телефона или пароль', code: msg }, 401)
    }
    if (msg === 'USER_BLOCKED') {
      return c.json({ success: false, error: 'Аккаунт заблокирован', code: msg }, 403)
    }
    return c.json({ success: false, error: 'Ошибка входа', code: msg }, 500)
  }
})

authRoutes.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')
  try {
    const tokens = await refresh(refreshToken, findUser)
    return c.json({ success: true, data: tokens })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'REFRESH_ERROR'
    return c.json({ success: false, error: 'Недействительный токен', code: msg }, 401)
  }
})

authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  return c.json({
    success: true,
    data: {
      id: 'user-mock',
      phone: '+79991234567',
      firstName: 'Иван',
      lastName: 'Иванов',
      tariff: 'free',
    },
  })
})
