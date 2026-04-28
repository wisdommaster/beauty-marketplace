import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { feedQuerySchema } from '@beauty/shared'
import { MOCK_FEED_SLOTS } from '../../tests/fixtures/slots'

export const feedRoutes = new Hono()

feedRoutes.get('/', zValidator('query', feedQuerySchema), async (c) => {
  const { lat, lon, radius, categories, page, limit } = c.req.valid('query')

  const categoryFilter = categories?.split(',').filter(Boolean) ?? []

  let slots = MOCK_FEED_SLOTS

  if (categoryFilter.length > 0) {
    slots = slots.filter((s) => categoryFilter.includes(s.studio.category))
  }

  if (radius !== undefined) {
    slots = slots.filter((s) => s.distanceKm <= radius)
  }

  const total = slots.length
  const offset = (page - 1) * limit
  const paginated = slots.slice(offset, offset + limit)

  return c.json({
    success: true,
    data: paginated,
    meta: {
      total,
      page,
      limit,
      hasMore: offset + limit < total,
      userLocation: { lat, lon },
    },
  })
})

feedRoutes.get('/slot/:id', async (c) => {
  const { id } = c.req.param()
  const slot = MOCK_FEED_SLOTS.find((s) => s.id === id)
  if (!slot) {
    return c.json({ success: false, error: 'Слот не найден', code: 'SLOT_NOT_FOUND' }, 404)
  }
  return c.json({ success: true, data: slot })
})

feedRoutes.post('/refresh', async (c) => {
  return c.json({
    success: true,
    data: MOCK_FEED_SLOTS,
    meta: {
      batchRotatedAt: new Date().toISOString(),
      nextRotationIn: 30 * 60,
    },
  })
})
