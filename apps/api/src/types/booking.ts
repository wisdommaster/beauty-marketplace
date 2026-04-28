import type { BookingStatus, PaymentMode } from '@beauty/shared'
import type { Booking } from '../db/schema'

export interface CreateBookingParams {
  slotId: string
  userId: string
  distanceKm: number
  idempotencyKey: string
}

export type BookingError = 
  | 'slot_not_found'
  | 'slot_full'
  | 'slot_unavailable'
  | 'slot_passed'
  | 'booking_not_found'
  | 'invalid_status'
  | 'already_cancelled'
  | 'already_completed'

export interface BookingOK {
  ok: true
  booking: Booking
}

export interface BookingErr {
  ok: false
  error: BookingError
  detail?: string
}

export type BookingResult = BookingOK | BookingErr

export interface IdempotencyCheck {
  exists: boolean
  booking?: Booking
}

export interface CancelBookingParams {
  bookingId: string
  userId: string
  reason?: string
}

export type { BookingStatus, PaymentMode }
