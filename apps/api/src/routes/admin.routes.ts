import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getDb } from '../db'
import { users, studios, bookings } from '../db/schema'

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const bookingsFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['held', 'paid', 'confirmed', 'completed', 'cancelled', 'late_cancel'])
    .optional(),
})

function requireAdmin(authHeader: string | undefined): boolean {
  return !!authHeader?.startsWith('Bearer ')
}

export const adminRoutes = new Hono()

adminRoutes.get('/stats', async (c) => {
  if (!requireAdmin(c.req.header('Authorization'))) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  const db = getDb()
  const [[{ userCount }], [{ businessCount }], [{ bookingCount }]] = await Promise.all([
    db.select({ userCount: sql<number>`count(*)` }).from(users),
    db.select({ businessCount: sql<number>`count(*)` }).from(studios),
    db.select({ bookingCount: sql<number>`count(*)` }).from(bookings),
  ])
  return c.json({
    success: true,
    data: { users: userCount, businesses: businessCount, bookings: bookingCount },
  })
})

adminRoutes.get('/users', zValidator('query', paginationSchema), async (c) => {
  if (!requireAdmin(c.req.header('Authorization'))) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  const { page, limit } = c.req.valid('query')
  const db = getDb()
  const offset = (page - 1) * limit
  const [[{ total }], items] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(users),
    db
      .select({
        id: users.id,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        tariff: users.tariff,
        isBlocked: users.isBlocked,
        incidents30d: users.incidents30d,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
  ])
  return c.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

adminRoutes.put('/users/:id/block', async (c) => {
  if (!requireAdmin(c.req.header('Authorization'))) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  const { id } = c.req.param()
  const db = getDb()
  const [user] = await db.select({ id: users.id, isBlocked: users.isBlocked }).from(users).where(eq(users.id, id))
  if (!user) {
    return c.json({ success: false, error: 'Пользователь не найден', code: 'USER_NOT_FOUND' }, 404)
  }
  const [updated] = await db
    .update(users)
    .set({ isBlocked: !user.isBlocked })
    .where(eq(users.id, id))
    .returning({ id: users.id, isBlocked: users.isBlocked })
  return c.json({ success: true, data: updated })
})

adminRoutes.get('/businesses', zValidator('query', paginationSchema), async (c) => {
  if (!requireAdmin(c.req.header('Authorization'))) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  const { page, limit } = c.req.valid('query')
  const db = getDb()
  const offset = (page - 1) * limit
  const [[{ total }], items] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(studios),
    db
      .select()
      .from(studios)
      .orderBy(desc(studios.createdAt))
      .limit(limit)
      .offset(offset),
  ])
  return c.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

adminRoutes.get('/bookings', zValidator('query', bookingsFilterSchema), async (c) => {
  if (!requireAdmin(c.req.header('Authorization'))) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }
  const { page, limit, status } = c.req.valid('query')
  const db = getDb()
  const offset = (page - 1) * limit
  const where = status ? eq(bookings.status, status) : undefined
  const [[{ total }], items] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(bookings).where(where),
    db
      .select()
      .from(bookings)
      .where(where)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset),
  ])
  return c.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})
