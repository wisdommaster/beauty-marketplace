import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { UserTariff } from '@beauty/shared'

const ACCESS_TTL = '15m'
const REFRESH_TTL = '30d'

export interface TokenPayload extends JWTPayload {
  userId: string
  phone: string
  tariff: UserTariff
  tokenType: 'access' | 'refresh'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserRecord {
  id: string
  phone: string
  passwordHash: string
  firstName: string
  lastName: string
  tariff: UserTariff
  isBlocked: boolean
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-change-in-prod!'
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(
  userId: string,
  phone: string,
  tariff: UserTariff,
): Promise<string> {
  return new SignJWT({ userId, phone, tariff, tokenType: 'access' } satisfies Omit<TokenPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret())
}

export async function signRefreshToken(userId: string, phone: string, tariff: UserTariff): Promise<string> {
  return new SignJWT({ userId, phone, tariff, tokenType: 'refresh' } satisfies Omit<TokenPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as TokenPayload
}

export async function issueTokens(
  userId: string,
  phone: string,
  tariff: UserTariff,
): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, phone, tariff),
    signRefreshToken(userId, phone, tariff),
  ])
  return { accessToken, refreshToken }
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + (process.env.PASSWORD_SALT ?? 'beauty-salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

export type UserLookupFn = (phone: string) => Promise<UserRecord | null>
export type UserCreateFn = (data: {
  phone: string
  passwordHash: string
  firstName: string
  lastName: string
}) => Promise<UserRecord>

export interface RegisterParams {
  phone: string
  password: string
  firstName: string
  lastName: string
  email?: string
}

export async function register(
  params: RegisterParams,
  findUser: UserLookupFn,
  createUser: UserCreateFn,
): Promise<AuthTokens> {
  const existing = await findUser(params.phone)
  if (existing) throw new Error('USER_ALREADY_EXISTS')

  const passwordHash = await hashPassword(params.password)
  const user = await createUser({
    phone: params.phone,
    passwordHash,
    firstName: params.firstName,
    lastName: params.lastName,
  })

  return issueTokens(user.id, user.phone, user.tariff)
}

export async function login(
  phone: string,
  password: string,
  findUser: UserLookupFn,
): Promise<AuthTokens> {
  const user = await findUser(phone)
  if (!user) throw new Error('INVALID_CREDENTIALS')
  if (user.isBlocked) throw new Error('USER_BLOCKED')

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  return issueTokens(user.id, user.phone, user.tariff)
}

export async function refresh(
  refreshToken: string,
  findUser: UserLookupFn,
): Promise<AuthTokens> {
  const payload = await verifyToken(refreshToken)
  if (payload.tokenType !== 'refresh') throw new Error('INVALID_TOKEN_TYPE')

  const user = await findUser(payload.phone)
  if (!user) throw new Error('USER_NOT_FOUND')
  if (user.isBlocked) throw new Error('USER_BLOCKED')

  return issueTokens(user.id, user.phone, user.tariff)
}
