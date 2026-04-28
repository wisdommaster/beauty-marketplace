import {
  FEED_WEIGHTS,
  FEED_CATEGORY_MODIFIERS,
  BUSINESS_TARIFFS,
  FEED_BATCH_SIZE,
  type Category,
  type UserTariff,
  type BusinessTariff,
} from '@beauty/shared'
import { calculateDiscount } from './discount.service'
import type { SlotFeedItem, CategorySlotType } from '../types/slot'

export interface ScoreInput {
  distanceKm: number
  maxRadiusKm: number
  minDiscount: number
  maxDiscount: number
  datetimeIso: string
  studioTariff: BusinessTariff
  categoryType: CategorySlotType
}

export interface ScoreResult {
  score: number
  distanceFactor: number
  discountFactor: number
  urgencyFactor: number
}

const MAX_URGENCY_HOURS = 12

export function scoreSlot(input: ScoreInput): ScoreResult {
  const { distanceKm, maxRadiusKm, minDiscount, maxDiscount, datetimeIso, studioTariff, categoryType } = input

  const distanceFactor = Math.max(0, Math.min(1, 1 - distanceKm / maxRadiusKm))

  const discount = calculateDiscount(distanceKm, maxRadiusKm, minDiscount, maxDiscount)
  const discountFactor = maxDiscount > 0 ? discount / maxDiscount : 0

  const hoursUntilSlot = (new Date(datetimeIso).getTime() - Date.now()) / (1000 * 60 * 60)
  const urgencyFactor = Math.max(0, Math.min(1, 1 - hoursUntilSlot / MAX_URGENCY_HOURS))

  const baseScore =
    distanceFactor * FEED_WEIGHTS.DISTANCE +
    discountFactor * FEED_WEIGHTS.DISCOUNT +
    urgencyFactor * FEED_WEIGHTS.URGENCY

  const categoryModifier =
    categoryType === 'preferred'
      ? FEED_CATEGORY_MODIFIERS.PREFERRED
      : categoryType === 'adjacent'
        ? FEED_CATEGORY_MODIFIERS.ADJACENT
        : FEED_CATEGORY_MODIFIERS.DISCOVERY

  const tariffPriority = BUSINESS_TARIFFS[studioTariff].feedPriority

  return {
    score: baseScore * categoryModifier * tariffPriority,
    distanceFactor,
    discountFactor,
    urgencyFactor,
  }
}

export interface FeedCandidate extends ScoreInput {
  slotId: string
  studioId: string
  studioCategory: Category
  basePrice: number
}

export interface RankedSlot {
  slotId: string
  studioId: string
  score: number
  discountPercent: number
  finalPrice: number
}

export function rankSlots(candidates: FeedCandidate[]): RankedSlot[] {
  return candidates
    .map((c) => {
      const { score } = scoreSlot(c)
      const discountPercent = calculateDiscount(c.distanceKm, c.maxRadiusKm, c.minDiscount, c.maxDiscount)
      const finalPrice = Math.round(c.basePrice * (1 - discountPercent))
      return { slotId: c.slotId, studioId: c.studioId, score, discountPercent, finalPrice }
    })
    .sort((a, b) => b.score - a.score)
}

export interface BuildBatchOptions {
  candidates: FeedCandidate[]
  batchSize?: number
  maxPerStudio?: number
  maxCategoryShare?: number
  minDistricts?: number
}

export function buildFeedBatch(options: BuildBatchOptions): RankedSlot[] {
  const { candidates, batchSize = FEED_BATCH_SIZE, maxPerStudio = 2 } = options

  const ranked = rankSlots(candidates)

  const studioCount: Record<string, number> = {}
  const result: RankedSlot[] = []

  for (const slot of ranked) {
    if (result.length >= batchSize) break
    studioCount[slot.studioId] = (studioCount[slot.studioId] ?? 0) + 1
    if (studioCount[slot.studioId] > maxPerStudio) continue
    result.push(slot)
  }

  return result
}

export function categorizeSlotsForUser(
  slots: Array<{ studioCategory: Category }>,
  preferredCategories: Category[],
  adjacentCategories: Category[],
): CategorySlotType[] {
  return slots.map((s) => {
    if (preferredCategories.includes(s.studioCategory)) return 'preferred'
    if (adjacentCategories.includes(s.studioCategory)) return 'adjacent'
    return 'discovery'
  })
}

export function getUserRadiusForTariff(tariff: UserTariff): number {
  const radii: Record<UserTariff, number> = {
    free: 7,
    comfort: 20,
    premium: Infinity,
  }
  return radii[tariff]
}
