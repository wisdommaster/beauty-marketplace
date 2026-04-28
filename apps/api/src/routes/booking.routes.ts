import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { verifyToken } from '../services/auth.service'
import {
  createHeldBooking,
  confirmPayment,
  confirmVisit,
  cancelBooking,
  processTimeouts,
  getBooking,
} from '../services/booking.service'

const createBookingSchema = z.object({
  slotId: z.string().min(1),
  distanceKm: z.number().nonnegative(),
  idempotencyKey: z.string().min(1),
})

const payBookingSchema = z.object({
  paymentId: z.string().min(1),
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

export const bookingRoutes = new Hono()

// Объявляем раньше /:id, иначе "timeout" будет захвачен как id
bookingRoutes.get('/timeout/process', async (c) => {
  const cancelled = await processTimeouts()
  return c.json({ success: true, data: { cancelled } })
})

bookingRoutes.post('/', zValidator('json', createBookingSchema), async (c) => {
  const userId = await extractUserId(c.req.header('Authorization'))
  if (!userId) {
    return c.json({ success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' }, 401)
  }

  const { slotId, distanceKm, idempotencyKey } = c.req.valid('json')
  const result = await createHeldBooking(userId, slotId, distanceKm, idempotencyKey)

  if (!result.ok) {
    const isConflict = result.error === 'slot_full' || result.error === 'slot_unavailable'
    return c.json(
      { success: false, error: result.error, code: result.error.toUpperCase() },
      isConflict ? 409 : 400,
    )
  }

  return c.json({ success: true, data: result.booking }, 201)
})

bookingRoutes.post('/:id/pay', zValidator('json', payBookingSchema), async (c) => {
  const { id } = c.req.param()
  const { paymentId } = c.req.valid('json')
  const result = await confirmPayment(id, paymentId)

  if (!result.ok) {
    const status = result.error === 'booking_not_found' ? 404 : 400
    return c.json(
      { success: false, error: result.error, code: result.error.toUpperCase(), detail: result.detail },
      status,
    )
  }

  return c.json({ success: true, data: result.booking })
})

bookingRoutes.post('/:id/confirm', async (c) => {
  const { id } = c.req.param()
  const result = await confirmVisit(id)

  if (!result.ok) {
    const status = result.error === 'booking_not_found' ? 404 : 400
    return c.json(
      { success: false, error: result.error, code: result.error.toUpperCase(), detail: result.detail },
      status,
    )
  }

  return c.json({ success: true, data: result.booking })
})

bookingRoutes.post('/:id/cancel', async (c) => {
  const { id } = c.req.param()
  const result = await cancelBooking(id)

  if (!result.ok) {
    const status = result.error === 'booking_not_found' ? 404 : 400
    return c.json(
      { success: false, error: result.error, code: result.error.toUpperCase() },
      status,
    )
  }

  return c.json({ success: true, data: result.booking })
})

bookingRoutes.get('/:id', async (c) => {
  const { id } = c.req.param()
  const booking = await getBooking(id)

  if (!booking) {
    return c.json({ success: false, error: 'Бронь не найдена', code: 'BOOKING_NOT_FOUND' }, 404)
  }

  return c.json({ success: true, data: booking })
})
