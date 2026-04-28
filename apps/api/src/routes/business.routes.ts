import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, gt, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getDb } from '../db'
import { studios, services, slots } from '../db/schema'
import { verifyToken } from '../services/auth.service'

const updateServiceSchema = z.object({
  platformCategory: z.string().min(1).optional(),
  description: z.string().optional(),
  level: z.string().optional(),
  whatToBring: z.string().optional(),
})

const publishSlotSchema = z.object({
  maxDiscount: z.number().min(0).max(1),
  maxRadius: z.number().positive(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

async function extractUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = await verifyToken(authHeader.slice(7))
    if (payload.tokenType !== 'access') return null
    return payload.userId
  } catch {
    return null
  }
}

export const businessRoutes = new Hono()

businessRoutes.get('/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb()
  const [studio] = await db.select().from(studios).where(eq(studios.id, id))
  if (!studio) {
    return c.json({ success: false, error: 'Студия не найдена', code: 'BUSINESS_NOT_FOUND' }, 404)
  }
  return c.json({ success: true, data: studio })
})

businessRoutes.get('/:id/services', async (c) => {
  const { id } = c.req.param()
  const db = getDb()
  const [studio] = await db.select({ id: studios.id }).from(studios).where(eq(studios.id, id))
  if (!studio) {
    return c.json({ success: false, error: 'Студия не найдена', code: 'BUSINESS_NOT_FOUND' }, 404)
  }
  const result = await db
    .select()
    .from(services)
    .where(and(eq(services.studioId, id), eq(services.isActive, true)))
  return c.json({ success: true, data: result })
})

businessRoutes.get('/:id/slots', zValidator('query', paginationSchema), async (c) => {
  const { id } = c.req.param()
  const { page, limit } = c.req.valid('query')
  const db = getDb()
  const [studio] = await db.select({ id: studios.id }).from(studios).where(eq(studios.id, id))
  if (!studio) {
    return c.json({ success: false, error: 'Студия не найдена', code: 'BUSINESS_NOT_FOUND' }, 404)
  }
  const now = new Date().toISOString()
  const offset = (page - 1) * limit
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(slots)
    .where(and(eq(slots.studioId, id), eq(slots.status, 'available'), gt(slots.datetime, now)))
  const items = await db
    .select()
    .from(slots)
    .where(and(eq(slots.studioId, id), eq(slots.status, 'available'), gt(slots.datetime, now)))
    .orderBy(asc(slots.datetime))
    .limit(limit)
    .offset(offset)
  return c.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

businessRoutes.put(
  '/:id/services/:serviceId',
  zValidator('json', updateServiceSchema),
  async (c) => {
    const userId = await extractUserId(c.req.header('Authorization'))
    if (!userId) {
      return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
    }
    const { id, serviceId } = c.req.param()
    const body = c.req.valid('json')
    if (Object.keys(body).length === 0) {
      return c.json({ success: false, error: 'Нет данных для обновления', code: 'EMPTY_UPDATE' }, 400)
    }
    const db = getDb()
    const updates: Partial<typeof services.$inferInsert> = {
      ...body,
      updatedAt: new Date().toISOString(),
    }
    const updated = await db
      .update(services)
      .set(updates)
      .where(and(eq(services.id, serviceId), eq(services.studioId, id)))
      .returning()
    if (updated.length === 0) {
      return c.json({ success: false, error: 'Услуга не найдена', code: 'SERVICE_NOT_FOUND' }, 404)
    }
    return c.json({ success: true, data: updated[0] })
  },
)

businessRoutes.post(
  '/:id/slots/:slotId/publish',
  zValidator('json', publishSlotSchema),
  async (c) => {
    const userId = await extractUserId(c.req.header('Authorization'))
    if (!userId) {
      return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
    }
    const { id, slotId } = c.req.param()
    const { maxDiscount, maxRadius } = c.req.valid('json')
    const db = getDb()
    const updated = await db
      .update(slots)
      .set({
        maxDiscount,
        maxRadius,
        status: 'available',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(slots.id, slotId), eq(slots.studioId, id)))
      .returning()
    if (updated.length === 0) {
      return c.json({ success: false, error: 'Слот не найден', code: 'SLOT_NOT_FOUND' }, 404)
    }
    return c.json({ success: true, data: updated[0] }, 200)
  },
)
