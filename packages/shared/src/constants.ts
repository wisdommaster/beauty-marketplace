export const BUSINESS_TARIFFS = {
  start: {
    name: 'Start' as const,
    priceMonthly: 0,
    radiusKm: 3,
    minDiscount: 0.05,
    maxDiscount: 0.20,
    maxServices: 2,
    slotsPerWeek: 7,
    feedPriority: 1.0,
    maxLocations: 1,
  },
  growth: {
    name: 'Growth' as const,
    priceMonthly: 3990,
    radiusKm: 10,
    minDiscount: 0.10,
    maxDiscount: 0.35,
    maxServices: 15,
    slotsPerWeek: 14,
    feedPriority: 1.5,
    maxLocations: 1,
  },
  maximum: {
    name: 'Maximum' as const,
    priceMonthly: 7990,
    radiusKm: 25,
    minDiscount: 0.15,
    maxDiscount: 0.50,
    maxServices: Infinity,
    slotsPerWeek: 21,
    feedPriority: 2.5,
    maxLocations: 5,
  },
} as const

export const USER_TARIFFS = {
  free: {
    name: 'Free' as const,
    priceMonthly: 0,
    radiusKm: 7,
    refreshesPerDay: 3,
    maxCategories: 2,
  },
  comfort: {
    name: 'Comfort' as const,
    priceMonthly: 299,
    radiusKm: 20,
    refreshesPerDay: 10,
    maxCategories: 5,
  },
  premium: {
    name: 'Premium' as const,
    priceMonthly: 599,
    radiusKm: Infinity,
    refreshesPerDay: Infinity,
    maxCategories: Infinity,
  },
} as const

export const CATEGORIES = [
  'hair',
  'nails',
  'makeup',
  'massage',
  'spa',
  'cosmetology',
  'eyebrows',
  'lashes',
  'fitness',
  'yoga',
  'epilation',
  'tattoo',
] as const

export const BOOKING_STATUSES = [
  'held',
  'paid',
  'confirmed',
  'completed',
  'cancelled',
  'late_cancel',
] as const

export const SLOT_STATUSES = [
  'available',
  'reserved',
  'paid',
  'synced',
  'cancelled',
] as const

export const PAYMENT_MODES = ['offline_only', 'online_required'] as const

export const FEED_WEIGHTS = {
  DISTANCE: 0.35,
  DISCOUNT: 0.40,
  URGENCY: 0.25,
} as const

export const FEED_CATEGORY_MODIFIERS = {
  PREFERRED: 1.5,
  ADJACENT: 1.0,
  DISCOVERY: 0.8,
} as const

export const FEED_BATCH_SIZE = 10

export const PIN_COLORS = {
  start: '#4CAF50',
  growth: '#2196F3',
  maximum: '#9C27B0',
} as const

export const BOOKING_TIMEOUT_MS = {
  ONLINE_REQUIRED: 5 * 60 * 1000,
  OFFLINE_ONLY: 10 * 60 * 1000,
} as const

export const LATE_CANCEL_THRESHOLD_MINUTES = 30

export const MAX_INCIDENTS_30D = 3
