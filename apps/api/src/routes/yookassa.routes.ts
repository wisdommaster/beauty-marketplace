import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createPayment, capturePayment, cancelPayment, getPayment, parseWebhook } from '../integrations/yookassa/client'
import { confirmPayment } from '../services/booking.service'

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  bookingId: z.string().min(1),
  userId: z.string().min(1),
  returnUrl: z.string().url().optional(),
})

export const paymentRoutes = new Hono()

paymentRoutes.post('/create', zValidator('json', createPaymentSchema), (c) => {
  const { amount, bookingId, userId, returnUrl } = c.req.valid('json')

  const payment = createPayment({ amount, bookingId, userId, returnUrl })

  return c.json({ success: true, data: payment }, 201)
})

paymentRoutes.post('/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-yookassa-signature') ?? ''

  // Мок: подпись всегда валидна
  const event = parseWebhook(body)
  if (!event) {
    return c.json({ success: false, error: 'Invalid webhook body' }, 400)
  }

  if (event.type === 'payment.succeeded') {
    const bookingId = event.object.metadata?.bookingId
    if (bookingId) {
      const result = confirmPayment(bookingId, event.object.id)
      if (!result.ok) {
        return c.json({ success: false, error: result.error }, 400)
      }
    }
  }

  return c.json({ success: true })
})

paymentRoutes.get('/:id', (c) => {
  const { id } = c.req.param()
  const payment = getPayment(id)
  if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)
  return c.json({ success: true, data: payment })
})

paymentRoutes.post('/:id/capture', (c) => {
  const { id } = c.req.param()
  const payment = capturePayment(id)
  if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)
  return c.json({ success: true, data: payment })
})

paymentRoutes.post('/:id/cancel', (c) => {
  const { id } = c.req.param()
  const payment = cancelPayment(id)
  if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)
  return c.json({ success: true, data: payment })
})
