import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'
import { setTestDb } from '../db'
import {
  createHeldBooking,
  confirmPayment,
  confirmVisit,
  completeVisit,
  cancelBooking,
  processTimeouts,
  getBooking,
  isUserRestricted,
} from './booking.service'

let testDb: Database.Database

function exec(sql: string, ...params: any[]) {
  if (params.length > 0) {
    testDb.prepare(sql).run(...params)
  } else {
    testDb.exec(sql)
  }
}

function seed() {
  testDb.exec("INSERT INTO studios (id, name, address, lat, lon, category, tariff) VALUES ('s1','Test','Addr',60,30,'massage','growth')")
  testDb.exec("INSERT INTO services (id, studio_id, title, base_price, duration_min, platform_category) VALUES ('sv1','s1','Svc',5000,60,'massage')")
  testDb.exec("INSERT INTO users (id, phone, password_hash, first_name, last_name) VALUES ('u1','+7','h','A','B')")
}

function seedSlot(id = 'slot-1', overrides: Record<string, any> = {}) {
  const now = new Date()
  testDb.prepare(
    "INSERT INTO slots (id, studio_id, service_id, date, time, datetime, capacity, booked_count, base_price, max_discount, max_radius, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id, 's1', 'sv1',
    overrides.date ?? '2026-04-29',
    overrides.time ?? '14:00',
    overrides.datetime ?? new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    overrides.capacity ?? 1,
    overrides.bookedCount ?? 0,
    overrides.basePrice ?? 5000,
    overrides.maxDiscount ?? 0.5,
    overrides.maxRadius ?? 25,
    overrides.status ?? 'available'
  )
}

beforeEach(() => {
  testDb = new Database(':memory:')
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')
  setTestDb(drizzle(testDb, { schema }))

  testDb.exec(`
    CREATE TABLE studios (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, category TEXT NOT NULL, tariff TEXT NOT NULL DEFAULT 'start', yclients_company_id INTEGER, yclients_form_id INTEGER, phone TEXT, is_active INTEGER NOT NULL DEFAULT 1, yandex_rating REAL, yclients_api_key TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE services (id TEXT PRIMARY KEY, studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE, title TEXT NOT NULL, base_price REAL NOT NULL, duration_min INTEGER NOT NULL, platform_category TEXT NOT NULL, yclients_service_id INTEGER, format TEXT NOT NULL DEFAULT 'individual', level TEXT, description TEXT, staff_id TEXT, staff_name TEXT, staff_role TEXT, staff_experience TEXT, what_to_bring TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE slots (id TEXT PRIMARY KEY, studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE, service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE, date TEXT NOT NULL, time TEXT NOT NULL, datetime TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 1, booked_count INTEGER NOT NULL DEFAULT 0, base_price REAL NOT NULL, max_discount REAL NOT NULL, max_radius REAL NOT NULL, status TEXT NOT NULL DEFAULT 'available', staff_id TEXT, yclients_staff_id INTEGER, yclients_service_id INTEGER, yclients_sync_at TEXT, published_at TEXT NOT NULL DEFAULT (datetime('now')), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE users (id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, tariff TEXT NOT NULL DEFAULT 'free', refresh_tokens_count INTEGER NOT NULL DEFAULT 0, preferred_categories TEXT NOT NULL DEFAULT '[]', search_radius REAL NOT NULL DEFAULT 7, preferred_time TEXT, incidents_30d INTEGER NOT NULL DEFAULT 0, is_blocked INTEGER NOT NULL DEFAULT 0, email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE bookings (id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES slots(id), user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'held', final_price REAL NOT NULL, discount_amount REAL NOT NULL, discount_percent REAL NOT NULL, distance_km REAL NOT NULL, idempotency_key TEXT NOT NULL, payment_id TEXT, payment_status TEXT, yclients_booking_id INTEGER, held_at TEXT, paid_at TEXT, confirmed_at TEXT, cancelled_at TEXT, completed_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  `)
})

afterEach(() => {
  testDb.close()
})

describe('createHeldBooking', () => {
  beforeEach(seed)

  it('создаёт бронь со статусом HELD', () => {
    seedSlot()
    const result = createHeldBooking('u1', 'slot-1', 6.5, 'idem-1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.booking.status).toBe('held')
      expect(result.booking.userId).toBe('u1')
      expect(result.booking.slotId).toBe('slot-1')
      expect(result.booking.distanceKm).toBeCloseTo(6.5)
    }
  })

  it('увеличивает bookedCount', () => {
    seedSlot('slot-1', { capacity: 4 })
    createHeldBooking('u1', 'slot-1', 3, 'idem-2')
    const updated = testDb.prepare('SELECT booked_count FROM slots WHERE id = ?').get('slot-1') as any
    expect(updated.booked_count).toBe(1)
  })

  it('отклоняет заполненный слот', () => {
    seedSlot('slot-1', { capacity: 1, bookedCount: 1 })
    const result = createHeldBooking('u1', 'slot-1', 3, 'idem-3')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('slot_full')
  })

  it('идемпотентность', () => {
    seedSlot('slot-1', { capacity: 4 })
    const r1 = createHeldBooking('u1', 'slot-1', 3, 'idem-4')
    const r2 = createHeldBooking('u1', 'slot-1', 3, 'idem-4')
    expect(r1.ok && r2.ok).toBe(true)
    if (r1.ok && r2.ok) expect(r2.booking.id).toBe(r1.booking.id)
    const updated = testDb.prepare('SELECT booked_count FROM slots WHERE id = ?').get('slot-1') as any
    expect(updated.booked_count).toBe(1)
  })
})

describe('confirmPayment', () => {
  beforeEach(seed)

  it('HELD → PAID', () => {
    seedSlot()
    const held = createHeldBooking('u1', 'slot-1', 3, 'p1')
    expect(held.ok).toBe(true)
    if (!held.ok) return
    const result = confirmPayment(held.booking.id, 'pay-1')
    expect(result.ok && result.booking.status === 'paid').toBe(true)
  })
})

describe('confirmVisit', () => {
  beforeEach(seed)

  it('HELD → CONFIRMED', () => {
    seedSlot()
    const held = createHeldBooking('u1', 'slot-1', 3, 'v1')
    if (!held.ok) return
    const result = confirmVisit(held.booking.id)
    expect(result.ok && result.booking.status === 'confirmed').toBe(true)
  })
})

describe('completeVisit', () => {
  beforeEach(seed)

  it('CONFIRMED → COMPLETED', () => {
    seedSlot()
    const held = createHeldBooking('u1', 'slot-1', 3, 'c1')
    if (!held.ok) return
    confirmVisit(held.booking.id)
    const result = completeVisit(held.booking.id)
    expect(result.ok && result.booking.status === 'completed').toBe(true)
  })
})

describe('cancelBooking', () => {
  beforeEach(seed)

  it('>30 мин → CANCELLED', () => {
    const future = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    seedSlot('slot-1', { datetime: future })
    const held = createHeldBooking('u1', 'slot-1', 3, 'c1')
    if (!held.ok) return
    const result = cancelBooking(held.booking.id)
    expect(result.ok && result.booking.status === 'cancelled').toBe(true)
  })

  it('≤30 мин → LATE_CANCEL', () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    seedSlot('slot-1', { datetime: soon })
    const held = createHeldBooking('u1', 'slot-1', 3, 'c2')
    if (!held.ok) return
    const result = cancelBooking(held.booking.id)
    expect(result.ok && result.booking.status === 'late_cancel').toBe(true)
    const user = testDb.prepare('SELECT incidents_30d FROM users WHERE id = ?').get('u1') as any
    expect(user.incidents_30d).toBe(1)
  })
})

describe('processTimeouts', () => {
  beforeEach(seed)

  it('HELD >5 мин → отмена', () => {
    seedSlot()
    const held = createHeldBooking('u1', 'slot-1', 3, 't1')
    if (!held.ok) return
    testDb.prepare('UPDATE bookings SET held_at = ? WHERE id = ?')
      .run(new Date(Date.now() - 6 * 60 * 1000).toISOString(), held.booking.id)
    processTimeouts()
    const updated = getBooking(held.booking.id)
    expect(updated?.status === 'cancelled' || updated?.status === 'late_cancel').toBe(true)
  })

  it('свежий HELD — не трогает', () => {
    seedSlot()
    const held = createHeldBooking('u1', 'slot-1', 3, 't2')
    if (!held.ok) return
    processTimeouts()
    expect(getBooking(held.booking.id)?.status).toBe('held')
  })
})

describe('isUserRestricted', () => {
  beforeEach(() => {
    testDb.exec("INSERT INTO users (id, phone, password_hash, first_name, last_name, incidents_30d) VALUES ('bad','+7','h','B','U',3)")
  })

  it('3 инцидента → restricted', () => {
    expect(isUserRestricted('bad')).toBe(true)
  })
})
