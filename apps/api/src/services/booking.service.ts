/**
 * Booking Service — статусная машина бронирования
 * 
 * Состояния: HELD → PAID → CONFIRMED → COMPLETED
 *                       → CANCELLED / LATE_CANCEL
 * 
 * Таймауты: ONLINE=5мин, OFFLINE=10мин
 * Late cancel: ≤30 мин до начала
 */

import { and, eq, lt, sql } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { slots, bookings, users, type Slot, type Booking } from '../db/schema'
import { computeSlotDiscount } from './discount.service'
import { calculateDiscount } from './discount.service'
import {
  BOOKING_TIMEOUT_MS,
  LATE_CANCEL_THRESHOLD_MINUTES,
  MAX_INCIDENTS_30D,
  BOOKING_STATUSES,
} from '@beauty/shared'
import type { IdempotencyCheck, BookingResult, BookingError, BookingOK } from '../types/booking'

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000

export async function findIdempotentBooking(key: string): Promise<Booking | null> {
  const db = getDb()
  const rows = db.select().from(bookings).where(eq(bookings.idempotencyKey, key)).all()
  if (rows.length === 0) return null
  const row = rows[0]
  const age = Date.now() - new Date(row.createdAt).getTime()
  if (age > IDEMPOTENCY_TTL_MS) return null
  return row as Booking
}

export async function createHeldBooking(
  userId: string,
  slotId: string,
  distanceKm: number,
  idempotencyKey: string,
): Promise<BookingResult> {
  // Idempotency
  const existing = await findIdempotentBooking(idempotencyKey)
  if (existing) return { ok: true, booking: existing }

  const db = getDb()

  // Атомарный захват слота
  const result = db.transaction((): BookingResult => {
    const slotRows = db.select().from(slots).where(eq(slots.id, slotId)).all()
    if (slotRows.length === 0) return { ok: false, error: 'slot_not_found' }
    const slot = slotRows[0] as Slot

    if (slot.bookedCount >= slot.capacity) {
      return { ok: false, error: 'slot_full' }
    }

    if (slot.status !== 'available') {
      return { ok: false, error: 'slot_unavailable' }
    }

    // Проверка слота не в прошлом
    const slotTime = new Date(slot.datetime).getTime()
    if (slotTime <= Date.now()) {
      return { ok: false, error: 'slot_passed' }
    }

    // Захват
    db.update(slots)
      .set({
        bookedCount: slot.bookedCount + 1,
        status: slot.bookedCount + 1 >= slot.capacity ? 'reserved' : 'available',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(slots.id, slotId))
      .run()

    // Расчёт скидки
    const discountResult = computeSlotDiscount(
      slot.basePrice,
      distanceKm,
      slot.maxRadius,
      0, // minDiscount определяется тарифом бизнеса, хранится в контексте
      slot.maxDiscount,
    )

    const bookingId = uuid()
    const now = new Date().toISOString()

    db.insert(bookings).values({
      id: bookingId,
      slotId,
      userId,
      status: 'held',
      finalPrice: discountResult.finalPrice,
      discountAmount: discountResult.discountAmount,
      discountPercent: Math.round(discountResult.discountPercent * 100) / 100,
      distanceKm: Math.round(distanceKm * 100) / 100,
      idempotencyKey,
      heldAt: now,
      createdAt: now,
    } as any).run()

    const newBooking = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()[0] as Booking

    return { ok: true, booking: newBooking }
  })

  return result
}

export async function confirmPayment(
  bookingId: string,
  paymentId: string,
): Promise<BookingResult> {
  const db = getDb()

  const result = db.transaction((): BookingResult => {
    const rows = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()
    if (rows.length === 0) return { ok: false, error: 'booking_not_found' }

    const booking = rows[0] as Booking
    if (booking.status !== 'held') {
      return { ok: false, error: 'invalid_status', detail: `expected held, got ${booking.status}` }
    }

    const now = new Date().toISOString()
    db.update(bookings)
      .set({ status: 'paid', paymentId, paymentStatus: 'succeeded', paidAt: now })
      .where(eq(bookings.id, bookingId))
      .run()

    const updated = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()[0] as Booking
    return { ok: true, booking: updated }
  })

  return result
}

export async function confirmVisit(bookingId: string): Promise<BookingResult> {
  const db = getDb()

  const result = db.transaction((): BookingResult => {
    const rows = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()
    if (rows.length === 0) return { ok: false, error: 'booking_not_found' }

    const booking = rows[0] as Booking
    if (booking.status !== 'held' && booking.status !== 'paid') {
      return { ok: false, error: 'invalid_status', detail: `cannot confirm from ${booking.status}` }
    }

    const now = new Date().toISOString()
    db.update(bookings)
      .set({ status: 'confirmed', confirmedAt: now })
      .where(eq(bookings.id, bookingId))
      .run()

    const updated = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()[0] as Booking
    return { ok: true, booking: updated }
  })

  return result
}

export async function completeVisit(bookingId: string): Promise<BookingResult> {
  const db = getDb()

  const result = db.transaction((): BookingResult => {
    const rows = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()
    if (rows.length === 0) return { ok: false, error: 'booking_not_found' }

    const booking = rows[0] as Booking
    if (booking.status !== 'confirmed') {
      return { ok: false, error: 'invalid_status', detail: `cannot complete from ${booking.status}` }
    }

    const now = new Date().toISOString()
    db.update(bookings).set({ status: 'completed', completedAt: now }).where(eq(bookings.id, bookingId)).run()

    const updated = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()[0] as Booking
    return { ok: true, booking: updated }
  })

  return result
}

export async function cancelBooking(bookingId: string): Promise<BookingResult> {
  const db = getDb()

  const result = db.transaction((): BookingResult => {
    const rows = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()
    if (rows.length === 0) return { ok: false, error: 'booking_not_found' }

    const booking = rows[0] as Booking
    if (booking.status === 'cancelled' || booking.status === 'late_cancel') {
      return { ok: false, error: 'already_cancelled' }
    }
    if (booking.status === 'completed') {
      return { ok: false, error: 'already_completed' }
    }

    // Определить: late cancel или обычная отмена
    const slotRows = db.select().from(slots).where(eq(slots.id, booking.slotId)).all()
    if (slotRows.length === 0) return { ok: false, error: 'slot_not_found' }

    const slot = slotRows[0] as Slot
    const minutesUntilStart = (new Date(slot.datetime).getTime() - Date.now()) / (1000 * 60)

    const isLateCancel = minutesUntilStart <= LATE_CANCEL_THRESHOLD_MINUTES
    const newStatus = isLateCancel ? 'late_cancel' : 'cancelled'

    const now = new Date().toISOString()

    // Освободить слот
    db.update(slots)
      .set({
        bookedCount: Math.max(0, slot.bookedCount - 1),
        status: 'available',
        updatedAt: now,
      })
      .where(eq(slots.id, booking.slotId))
      .run()

    // Обновить бронь
    db.update(bookings)
      .set({ status: newStatus, cancelledAt: now })
      .where(eq(bookings.id, bookingId))
      .run()

    // Если late_cancel — увеличить счётчик инцидентов
    if (isLateCancel) {
      const userRows = db.select().from(users).where(eq(users.id, booking.userId)).all()
      if (userRows.length > 0) {
        const user = userRows[0]
        db.update(users)
          .set({ incidents30d: (user.incidents30d ?? 0) + 1 })
          .where(eq(users.id, booking.userId))
          .run()
      }
    }

    const updated = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()[0] as Booking
    return { ok: true, booking: updated }
  })

  return result
}

export async function processTimeouts(): Promise<number> {
  const db = getDb()
  let cancelled = 0

  const now = Date.now()

  // ONLINE_REQUIRED: 5 мин
  const onlineCutoff = new Date(now - BOOKING_TIMEOUT_MS.ONLINE_REQUIRED).toISOString()
  const onlineExpired = db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'held'),
        lt(bookings.heldAt, onlineCutoff),
      ),
    )
    .all()

  for (const b of onlineExpired) {
    cancelBooking(b.id)
    cancelled++
  }

  // OFFLINE_ONLY: 10 мин
  const offlineCutoff = new Date(now - BOOKING_TIMEOUT_MS.OFFLINE_ONLY).toISOString()
  const offlineExpired = db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'held'),
        lt(bookings.heldAt, offlineCutoff),
      ),
    )
    .all()

  for (const b of offlineExpired) {
    // Не дублировать уже отменённые
    const current = db.select().from(bookings).where(eq(bookings.id, b.id)).all()[0] as Booking
    if (current.status !== 'cancelled' && current.status !== 'late_cancel') {
      cancelBooking(b.id)
      cancelled++
    }
  }

  return cancelled
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const db = getDb()
  const rows = db.select().from(bookings).where(eq(bookings.id, bookingId)).all()
  return rows.length > 0 ? (rows[0] as Booking) : null
}

export async function isUserRestricted(userId: string): Promise<boolean> {
  const db = getDb()
  const rows = db.select().from(users).where(eq(users.id, userId)).all()
  if (rows.length === 0) return false
  return (rows[0].incidents30d ?? 0) >= MAX_INCIDENTS_30D
}
