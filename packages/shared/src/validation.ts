import { z } from 'zod'
import { CATEGORIES } from './constants'

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})

export const phoneSchema = z
  .string()
  .regex(/^\+7\d{10}$/, 'Номер телефона должен быть в формате +7XXXXXXXXXX')

export const registerSchema = z.object({
  phone: phoneSchema,
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
})

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const feedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).optional(),
  categories: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export const createBookingSchema = z.object({
  slotId: z.string().min(1),
})

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const publishSlotSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  datetime: z.string().datetime(),
  capacity: z.number().int().min(1).max(100).default(1),
  basePrice: z.number().min(0),
  maxDiscount: z.number().min(0).max(1),
  maxRadius: z.number().min(0.1).max(100),
})

export const categorySchema = z.enum(CATEGORIES)

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type FeedQuery = z.infer<typeof feedQuerySchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type PublishSlotInput = z.infer<typeof publishSlotSchema>
