/**
 * YooKassa Payment Client (mock)
 * 
 * Фаза MVP: все вызовы возвращают мок-результаты.
 * Продакшн: реальные API-вызовы к YooKassa.
 */

export interface PaymentRequest {
  amount: number
  bookingId: string
  userId: string
  returnUrl?: string
}

export interface PaymentResponse {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  confirmationUrl: string
}

export interface WebhookEvent {
  type: 'payment.succeeded' | 'payment.canceled' | 'refund.succeeded'
  event: string
  object: {
    id: string
    status: string
    amount: { value: string; currency: string }
    metadata?: Record<string, string>
  }
}

const PAYMENTS = new Map<string, PaymentResponse>()

export function createPayment(req: PaymentRequest): PaymentResponse {
  const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const payment: PaymentResponse = {
    id,
    status: 'pending',
    confirmationUrl: `https://mock-yookassa.test/confirm/${id}`,
  }
  PAYMENTS.set(id, payment)
  return payment
}

export function capturePayment(paymentId: string): PaymentResponse | null {
  const payment = PAYMENTS.get(paymentId)
  if (!payment) return null
  payment.status = 'succeeded'
  return payment
}

export function cancelPayment(paymentId: string): PaymentResponse | null {
  const payment = PAYMENTS.get(paymentId)
  if (!payment) return null
  payment.status = 'canceled'
  return payment
}

export function getPayment(paymentId: string): PaymentResponse | null {
  return PAYMENTS.get(paymentId) ?? null
}

export function verifyWebhook(body: string, signature: string): boolean {
  // Мок: всегда true
  return true
}

export function parseWebhook(body: string): WebhookEvent | null {
  try {
    return JSON.parse(body) as WebhookEvent
  } catch {
    return null
  }
}
