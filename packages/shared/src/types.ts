import type {
  BOOKING_STATUSES,
  SLOT_STATUSES,
  CATEGORIES,
  PAYMENT_MODES,
} from './constants'

export type Category = (typeof CATEGORIES)[number]
export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type SlotStatus = (typeof SLOT_STATUSES)[number]
export type PaymentMode = (typeof PAYMENT_MODES)[number]
export type BusinessTariff = 'start' | 'growth' | 'maximum'
export type UserTariff = 'free' | 'comfort' | 'premium'
export type ServiceFormat = 'individual' | 'group'

export interface Coordinates {
  lat: number
  lon: number
}

export interface ApiResponse<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export interface ApiError {
  success: false
  error: string
  code: string
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface StudioPublic {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  category: Category
  tariff: BusinessTariff
  yandexRating: number | null
}

export interface ServicePublic {
  id: string
  studioId: string
  title: string
  basePrice: number
  durationMin: number
  category: Category
  format: ServiceFormat
  description: string | null
  staffName: string | null
}

export interface SlotPublic {
  id: string
  studioId: string
  serviceId: string
  datetime: string
  capacity: number
  bookedCount: number
  basePrice: number
  maxDiscount: number
  maxRadius: number
  status: SlotStatus
  studio: StudioPublic
  service: ServicePublic
}

export interface BookingPublic {
  id: string
  slotId: string
  userId: string
  status: BookingStatus
  finalPrice: number
  discountAmount: number
  discountPercent: number
  distanceKm: number
  createdAt: string
}

export interface UserPublic {
  id: string
  phone: string
  email: string | null
  firstName: string
  lastName: string
  tariff: UserTariff
}

export interface FeedSlot extends SlotPublic {
  distanceKm: number
  discountPercent: number
  finalPrice: number
  score: number
}
