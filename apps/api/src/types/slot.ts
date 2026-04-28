import type { SlotStatus, Category, BusinessTariff, ServiceFormat } from '@beauty/shared'

export interface SlotWithStudio {
  id: string
  studioId: string
  serviceId: string
  staffId: string | null
  datetime: string
  date: string
  time: string
  capacity: number
  bookedCount: number
  basePrice: number
  maxDiscount: number
  maxRadius: number
  status: SlotStatus
  studio: {
    id: string
    name: string
    address: string
    lat: number
    lon: number
    category: Category
    tariff: BusinessTariff
    yandexRating: number | null
  }
  service: {
    id: string
    title: string
    durationMin: number
    format: ServiceFormat
    description: string | null
    staffName: string | null
  }
}

export interface SlotFeedItem extends SlotWithStudio {
  distanceKm: number
  discountPercent: number
  finalPrice: number
  score: number
}

export type CategorySlotType = 'preferred' | 'adjacent' | 'discovery' | 'wildcard'
