import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  issueTokens,
  register,
  login,
  refresh,
  type UserRecord,
} from './auth.service'

const mockUser: UserRecord = {
  id: 'user-1',
  phone: '+79991234567',
  passwordHash: '',
  firstName: 'Иван',
  lastName: 'Иванов',
  tariff: 'free',
  isBlocked: false,
}

describe('hashPassword / verifyPassword', () => {
  it('одинаковые пароли дают одинаковый хэш', async () => {
    const hash1 = await hashPassword('secret123')
    const hash2 = await hashPassword('secret123')
    expect(hash1).toBe(hash2)
  })

  it('разные пароли дают разные хэши', async () => {
    const hash1 = await hashPassword('secret123')
    const hash2 = await hashPassword('other456')
    expect(hash1).not.toBe(hash2)
  })

  it('verifyPassword возвращает true для верного пароля', async () => {
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('mypassword', hash)).toBe(true)
  })

  it('verifyPassword возвращает false для неверного пароля', async () => {
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('wrongpassword', hash)).toBe(false)
  })
})

describe('JWT tokens', () => {
  it('signAccessToken создаёт валидный токен', async () => {
    const token = await signAccessToken('user-1', '+79991234567', 'free')
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifyToken возвращает корректный payload access-токена', async () => {
    const token = await signAccessToken('user-1', '+79991234567', 'free')
    const payload = await verifyToken(token)
    expect(payload.userId).toBe('user-1')
    expect(payload.phone).toBe('+79991234567')
    expect(payload.tariff).toBe('free')
    expect(payload.tokenType).toBe('access')
  })

  it('verifyToken возвращает корректный payload refresh-токена', async () => {
    const token = await signRefreshToken('user-1', '+79991234567', 'comfort')
    const payload = await verifyToken(token)
    expect(payload.tokenType).toBe('refresh')
    expect(payload.tariff).toBe('comfort')
  })

  it('verifyToken выбрасывает ошибку для невалидного токена', async () => {
    await expect(verifyToken('invalid.token.here')).rejects.toThrow()
  })

  it('verifyToken выбрасывает ошибку для пустой строки', async () => {
    await expect(verifyToken('')).rejects.toThrow()
  })

  it('issueTokens возвращает access + refresh', async () => {
    const { accessToken, refreshToken } = await issueTokens('user-1', '+79991234567', 'premium')
    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()
    expect(accessToken).not.toBe(refreshToken)

    const accessPayload = await verifyToken(accessToken)
    const refreshPayload = await verifyToken(refreshToken)
    expect(accessPayload.tokenType).toBe('access')
    expect(refreshPayload.tokenType).toBe('refresh')
  })
})

describe('register', () => {
  const findUserEmpty: () => Promise<null> = async () => null
  const createUserMock = vi.fn(async (data: { phone: string; passwordHash: string; firstName: string; lastName: string }) => ({
    ...mockUser,
    ...data,
    id: 'new-user-id',
    tariff: 'free' as const,
    isBlocked: false,
  }))

  beforeEach(() => {
    createUserMock.mockClear()
  })

  it('регистрирует нового пользователя и возвращает токены', async () => {
    const tokens = await register(
      { phone: '+79991234567', password: 'password123', firstName: 'Иван', lastName: 'Иванов' },
      findUserEmpty,
      createUserMock,
    )
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
    expect(createUserMock).toHaveBeenCalledOnce()
  })

  it('хэширует пароль перед созданием пользователя', async () => {
    await register(
      { phone: '+79991234567', password: 'mysecret', firstName: 'А', lastName: 'Б' },
      findUserEmpty,
      createUserMock,
    )
    const callArgs = createUserMock.mock.calls[0][0]
    expect(callArgs.passwordHash).not.toBe('mysecret')
    expect(callArgs.passwordHash.length).toBe(64)
  })

  it('выбрасывает USER_ALREADY_EXISTS если пользователь существует', async () => {
    const findExisting = async () => mockUser
    await expect(
      register(
        { phone: '+79991234567', password: 'password123', firstName: 'А', lastName: 'Б' },
        findExisting,
        createUserMock,
      ),
    ).rejects.toThrow('USER_ALREADY_EXISTS')
    expect(createUserMock).not.toHaveBeenCalled()
  })
})

describe('login', () => {
  let userWithHash: UserRecord

  beforeEach(async () => {
    const passwordHash = await hashPassword('correctpassword')
    userWithHash = { ...mockUser, passwordHash }
  })

  it('возвращает токены при верных credentials', async () => {
    const findUser = async () => userWithHash
    const tokens = await login('+79991234567', 'correctpassword', findUser)
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
  })

  it('выбрасывает INVALID_CREDENTIALS при неверном пароле', async () => {
    const findUser = async () => userWithHash
    await expect(login('+79991234567', 'wrongpassword', findUser)).rejects.toThrow(
      'INVALID_CREDENTIALS',
    )
  })

  it('выбрасывает INVALID_CREDENTIALS если пользователь не найден', async () => {
    const findUser = async () => null
    await expect(login('+79991234567', 'anypassword', findUser)).rejects.toThrow(
      'INVALID_CREDENTIALS',
    )
  })

  it('выбрасывает USER_BLOCKED для заблокированного пользователя', async () => {
    const blockedUser = { ...userWithHash, isBlocked: true }
    const findUser = async () => blockedUser
    await expect(login('+79991234567', 'correctpassword', findUser)).rejects.toThrow(
      'USER_BLOCKED',
    )
  })
})

describe('refresh', () => {
  it('выдаёт новые токены по валидному refresh-токену', async () => {
    const token = await signRefreshToken(mockUser.id, mockUser.phone, mockUser.tariff)
    const findUser = async () => mockUser
    const tokens = await refresh(token, findUser)
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
  })

  it('выбрасывает INVALID_TOKEN_TYPE для access-токена', async () => {
    const accessToken = await signAccessToken(mockUser.id, mockUser.phone, mockUser.tariff)
    const findUser = async () => mockUser
    await expect(refresh(accessToken, findUser)).rejects.toThrow('INVALID_TOKEN_TYPE')
  })

  it('выбрасывает USER_NOT_FOUND если пользователь удалён', async () => {
    const token = await signRefreshToken(mockUser.id, mockUser.phone, mockUser.tariff)
    const findUser = async () => null
    await expect(refresh(token, findUser)).rejects.toThrow('USER_NOT_FOUND')
  })

  it('выбрасывает USER_BLOCKED для заблокированного пользователя', async () => {
    const token = await signRefreshToken(mockUser.id, mockUser.phone, mockUser.tariff)
    const blockedUser = { ...mockUser, isBlocked: true }
    const findUser = async () => blockedUser
    await expect(refresh(token, findUser)).rejects.toThrow('USER_BLOCKED')
  })

  it('выбрасывает ошибку для невалидного токена', async () => {
    await expect(refresh('not-a-token', async () => mockUser)).rejects.toThrow()
  })
})
