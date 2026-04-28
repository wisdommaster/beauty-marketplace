import type { BookingStatus, PaymentMode } from '@beauty/shared'

export interface CreateBookingParams {
  slotId: string
  userId: string
  distanceKm: number
  idempotencyKey: string
}

export interface BookingResult {
  id: string
  slotId: string
  userId: string
  status: BookingStatus
  finalPrice: number
  discountAmount: number
  discountPercent: number
  distanceKm: number
  heldAt: string
}

export interface CancelBookingParams {
  bookingId: string
  userId: string
  reason?: string
}

export type { BookingStatus, PaymentMode }
