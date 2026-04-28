import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const studios = sqliteTable('studios', {
  id: text('id').primaryKey(),
  yclientsCompanyId: integer('yclients_company_id'),
  yclientsFormId: integer('yclients_form_id'),
  name: text('name').notNull(),
  address: text('address').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  phone: text('phone'),
  category: text('category').notNull(),
  tariff: text('tariff', { enum: ['start', 'growth', 'maximum'] }).notNull().default('start'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  yandexRating: real('yandex_rating'),
  yclientsApiKey: text('yclients_api_key'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  studioId: text('studio_id').notNull().references(() => studios.id, { onDelete: 'cascade' }),
  yclientsServiceId: integer('yclients_service_id'),
  title: text('title').notNull(),
  basePrice: real('base_price').notNull(),
  durationMin: integer('duration_min').notNull(),
  platformCategory: text('platform_category').notNull(),
  format: text('format', { enum: ['individual', 'group'] }).notNull().default('individual'),
  level: text('level'),
  description: text('description'),
  staffId: text('staff_id'),
  staffName: text('staff_name'),
  staffRole: text('staff_role'),
  staffExperience: text('staff_experience'),
  whatToBring: text('what_to_bring'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const slots = sqliteTable('slots', {
  id: text('id').primaryKey(),
  studioId: text('studio_id').notNull().references(() => studios.id, { onDelete: 'cascade' }),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  staffId: text('staff_id'),
  yclientsStaffId: integer('yclients_staff_id'),
  yclientsServiceId: integer('yclients_service_id'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  datetime: text('datetime').notNull(),
  capacity: integer('capacity').notNull().default(1),
  bookedCount: integer('booked_count').notNull().default(0),
  basePrice: real('base_price').notNull(),
  maxDiscount: real('max_discount').notNull(),
  maxRadius: real('max_radius').notNull(),
  status: text('status', {
    enum: ['available', 'reserved', 'paid', 'synced', 'cancelled'],
  }).notNull().default('available'),
  yClientsSyncAt: text('yclients_sync_at'),
  publishedAt: text('published_at').notNull().default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  slotId: text('slot_id').notNull().references(() => slots.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status', {
    enum: ['held', 'paid', 'confirmed', 'completed', 'cancelled', 'late_cancel'],
  }).notNull().default('held'),
  finalPrice: real('final_price').notNull(),
  discountAmount: real('discount_amount').notNull(),
  discountPercent: real('discount_percent').notNull(),
  distanceKm: real('distance_km').notNull(),
  paymentId: text('payment_id'),
  paymentStatus: text('payment_status'),
  yclientsBookingId: integer('yclients_booking_id'),
  idempotencyKey: text('idempotency_key').notNull(),
  heldAt: text('held_at'),
  paidAt: text('paid_at'),
  confirmedAt: text('confirmed_at'),
  cancelledAt: text('cancelled_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  tariff: text('tariff', { enum: ['free', 'comfort', 'premium'] }).notNull().default('free'),
  refreshTokensCount: integer('refresh_tokens_count').notNull().default(0),
  preferredCategories: text('preferred_categories').notNull().default('[]'),
  searchRadius: real('search_radius').notNull().default(7),
  preferredTime: text('preferred_time'),
  incidents30d: integer('incidents_30d').notNull().default(0),
  isBlocked: integer('is_blocked', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type Studio = typeof studios.$inferSelect
export type NewStudio = typeof studios.$inferInsert
export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Slot = typeof slots.$inferSelect
export type NewSlot = typeof slots.$inferInsert
export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
