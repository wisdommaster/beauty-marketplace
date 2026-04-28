import type { BusinessTariff, UserTariff } from '@beauty/shared'

export interface BusinessTariffConfig {
  name: string
  priceMonthly: number
  radiusKm: number
  minDiscount: number
  maxDiscount: number
  maxServices: number
  slotsPerWeek: number
  feedPriority: number
  maxLocations: number
}

export interface UserTariffConfig {
  name: string
  priceMonthly: number
  radiusKm: number
  refreshesPerDay: number
  maxCategories: number
}

export type { BusinessTariff, UserTariff }
