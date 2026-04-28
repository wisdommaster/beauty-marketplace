import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  scoreSlot,
  rankSlots,
  buildFeedBatch,
  categorizeSlotsForUser,
  getUserRadiusForTariff,
  type ScoreInput,
  type FeedCandidate,
} from './feed.service'

function makeNowPlusHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

const baseInput: ScoreInput = {
  distanceKm: 5,
  maxRadiusKm: 25,
  minDiscount: 0.15,
  maxDiscount: 0.50,
  datetimeIso: makeNowPlusHours(6),
  studioTariff: 'maximum',
  categoryType: 'preferred',
}

describe('scoreSlot', () => {
  describe('факторы (distanceFactor, discountFactor, urgencyFactor)', () => {
    it('distanceFactor = 1 при distance=0', () => {
      const { distanceFactor } = scoreSlot({ ...baseInput, distanceKm: 0 })
      expect(distanceFactor).toBeCloseTo(1)
    })

    it('distanceFactor = 0 при distance=maxRadius', () => {
      const { distanceFactor } = scoreSlot({ ...baseInput, distanceKm: 25 })
      expect(distanceFactor).toBeCloseTo(0)
    })

    it('distanceFactor нормализован [0,1]', () => {
      const { distanceFactor } = scoreSlot(baseInput)
      expect(distanceFactor).toBeGreaterThanOrEqual(0)
      expect(distanceFactor).toBeLessThanOrEqual(1)
    })

    it('urgencyFactor = 1 при прошедшем слоте', () => {
      const { urgencyFactor } = scoreSlot({
        ...baseInput,
        datetimeIso: makeNowPlusHours(-1),
      })
      expect(urgencyFactor).toBeCloseTo(1)
    })

    it('urgencyFactor = 0 при слоте через 12+ часов', () => {
      const { urgencyFactor } = scoreSlot({
        ...baseInput,
        datetimeIso: makeNowPlusHours(13),
      })
      expect(urgencyFactor).toBeCloseTo(0)
    })

    it('urgencyFactor = 0.5 при слоте через 6 часов', () => {
      const { urgencyFactor } = scoreSlot({
        ...baseInput,
        datetimeIso: makeNowPlusHours(6),
      })
      expect(urgencyFactor).toBeCloseTo(0.5, 1)
    })

    it('discountFactor нормализован [0,1]', () => {
      const { discountFactor } = scoreSlot(baseInput)
      expect(discountFactor).toBeGreaterThanOrEqual(0)
      expect(discountFactor).toBeLessThanOrEqual(1)
    })
  })

  describe('веса: distance(0.35), discount(0.40), urgency(0.25)', () => {
    it('сумма весов = 1.0 (при одинаковых факторах и модификаторах ×1)', () => {
      const input: ScoreInput = {
        distanceKm: 0,
        maxRadiusKm: 25,
        minDiscount: 0,
        maxDiscount: 1,
        datetimeIso: makeNowPlusHours(-1),
        studioTariff: 'start',
        categoryType: 'adjacent',
      }
      const { score } = scoreSlot(input)
      // distanceFactor=1, discountFactor=1, urgencyFactor=1, modifier=1.0, tariff=1.0
      expect(score).toBeCloseTo(1.0)
    })

    it('baseScore = (0.35 × df) + (0.40 × dcf) + (0.25 × uf)', () => {
      const input: ScoreInput = {
        distanceKm: 0,
        maxRadiusKm: 10,
        minDiscount: 0,
        maxDiscount: 0.5,
        datetimeIso: makeNowPlusHours(6),
        studioTariff: 'start',
        categoryType: 'adjacent',
      }
      const { score, distanceFactor, discountFactor, urgencyFactor } = scoreSlot(input)
      const expected = distanceFactor * 0.35 + discountFactor * 0.40 + urgencyFactor * 0.25
      // tariffPriority=1.0, modifier=1.0
      expect(score).toBeCloseTo(expected, 5)
    })
  })

  describe('модификаторы категорий', () => {
    const baseNoMod: ScoreInput = {
      ...baseInput,
      studioTariff: 'start',
      distanceKm: 0,
      minDiscount: 0,
      maxDiscount: 1,
      datetimeIso: makeNowPlusHours(-1),
    }

    it('preferred = ×1.5', () => {
      const { score } = scoreSlot({ ...baseNoMod, categoryType: 'preferred' })
      expect(score).toBeCloseTo(1.5, 5)
    })

    it('adjacent = ×1.0', () => {
      const { score } = scoreSlot({ ...baseNoMod, categoryType: 'adjacent' })
      expect(score).toBeCloseTo(1.0, 5)
    })

    it('discovery = ×0.8', () => {
      const { score } = scoreSlot({ ...baseNoMod, categoryType: 'discovery' })
      expect(score).toBeCloseTo(0.8, 5)
    })

    it('preferred > adjacent > discovery', () => {
      const p = scoreSlot({ ...baseNoMod, categoryType: 'preferred' }).score
      const a = scoreSlot({ ...baseNoMod, categoryType: 'adjacent' }).score
      const d = scoreSlot({ ...baseNoMod, categoryType: 'discovery' }).score
      expect(p).toBeGreaterThan(a)
      expect(a).toBeGreaterThan(d)
    })
  })

  describe('тарифные приоритеты бизнеса', () => {
    const baseNoMod: ScoreInput = {
      ...baseInput,
      categoryType: 'adjacent',
      distanceKm: 0,
      minDiscount: 0,
      maxDiscount: 1,
      datetimeIso: makeNowPlusHours(-1),
    }

    it('Maximum (×2.5) > Growth (×1.5) > Start (×1.0)', () => {
      const max = scoreSlot({ ...baseNoMod, studioTariff: 'maximum', maxRadiusKm: 25, minDiscount: 0.15, maxDiscount: 0.50 })
      const growth = scoreSlot({ ...baseNoMod, studioTariff: 'growth', maxRadiusKm: 10, minDiscount: 0.10, maxDiscount: 0.35 })
      const start = scoreSlot({ ...baseNoMod, studioTariff: 'start', maxRadiusKm: 3, minDiscount: 0.05, maxDiscount: 0.20 })
      expect(max.score).toBeGreaterThan(growth.score)
      expect(growth.score).toBeGreaterThan(start.score)
    })

    it('Maximum ×2.5 при одинаковых других факторах', () => {
      const noModInput: ScoreInput = {
        distanceKm: 0,
        maxRadiusKm: 25,
        minDiscount: 0,
        maxDiscount: 1,
        datetimeIso: makeNowPlusHours(-1),
        studioTariff: 'maximum',
        categoryType: 'adjacent',
      }
      const { score } = scoreSlot(noModInput)
      // baseScore=1.0, modifier=1.0, tariff=2.5
      expect(score).toBeCloseTo(2.5, 5)
    })
  })
})

describe('rankSlots', () => {
  const makeCandidates = (): FeedCandidate[] => [
    {
      slotId: 'slot-1',
      studioId: 'studio-1',
      studioCategory: 'hair',
      basePrice: 3000,
      distanceKm: 2,
      maxRadiusKm: 25,
      minDiscount: 0.15,
      maxDiscount: 0.50,
      datetimeIso: makeNowPlusHours(2),
      studioTariff: 'maximum',
      categoryType: 'preferred',
    },
    {
      slotId: 'slot-2',
      studioId: 'studio-2',
      studioCategory: 'yoga',
      basePrice: 1500,
      distanceKm: 15,
      maxRadiusKm: 25,
      minDiscount: 0.15,
      maxDiscount: 0.50,
      datetimeIso: makeNowPlusHours(10),
      studioTariff: 'maximum',
      categoryType: 'discovery',
    },
    {
      slotId: 'slot-3',
      studioId: 'studio-1',
      studioCategory: 'nails',
      basePrice: 2000,
      distanceKm: 5,
      maxRadiusKm: 10,
      minDiscount: 0.10,
      maxDiscount: 0.35,
      datetimeIso: makeNowPlusHours(1),
      studioTariff: 'growth',
      categoryType: 'adjacent',
    },
  ]

  it('возвращает слоты отсортированные по score (убывание)', () => {
    const ranked = rankSlots(makeCandidates())
    expect(ranked.length).toBe(3)
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score)
    }
  })

  it('вычисляет finalPrice с учётом скидки', () => {
    const ranked = rankSlots(makeCandidates())
    for (const slot of ranked) {
      expect(slot.finalPrice).toBeGreaterThan(0)
      expect(slot.discountPercent).toBeGreaterThan(0)
    }
  })
})

describe('buildFeedBatch', () => {
  const makeCandidates = (count: number, studioId = 'studio-1'): FeedCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      slotId: `slot-${i}`,
      studioId,
      studioCategory: 'hair' as const,
      basePrice: 3000,
      distanceKm: i + 1,
      maxRadiusKm: 25,
      minDiscount: 0.15,
      maxDiscount: 0.50,
      datetimeIso: makeNowPlusHours(i + 1),
      studioTariff: 'maximum' as const,
      categoryType: 'preferred' as const,
    }))

  it('возвращает не более batchSize слотов', () => {
    const result = buildFeedBatch({ candidates: makeCandidates(20), batchSize: 10 })
    expect(result.length).toBeLessThanOrEqual(10)
  })

  it('ограничивает ≤2 слота от одной студии', () => {
    const result = buildFeedBatch({ candidates: makeCandidates(10, 'studio-only'), batchSize: 10, maxPerStudio: 2 })
    const studioCount = result.filter((s) => s.studioId === 'studio-only').length
    expect(studioCount).toBeLessThanOrEqual(2)
  })

  it('не ограничивает разные студии', () => {
    const mixed = [
      ...makeCandidates(2, 'studio-A'),
      ...makeCandidates(2, 'studio-B'),
      ...makeCandidates(2, 'studio-C'),
    ]
    const result = buildFeedBatch({ candidates: mixed, batchSize: 6, maxPerStudio: 2 })
    expect(result.length).toBe(6)
  })
})

describe('categorizeSlotsForUser', () => {
  it('preferred когда категория входит в предпочтения', () => {
    const types = categorizeSlotsForUser(
      [{ studioCategory: 'hair' }],
      ['hair', 'nails'],
      ['makeup'],
    )
    expect(types[0]).toBe('preferred')
  })

  it('adjacent когда категория смежная', () => {
    const types = categorizeSlotsForUser(
      [{ studioCategory: 'makeup' }],
      ['hair'],
      ['makeup', 'lashes'],
    )
    expect(types[0]).toBe('adjacent')
  })

  it('discovery для всех остальных категорий', () => {
    const types = categorizeSlotsForUser(
      [{ studioCategory: 'yoga' }],
      ['hair'],
      ['nails'],
    )
    expect(types[0]).toBe('discovery')
  })
})

describe('getUserRadiusForTariff', () => {
  it('free → 7 км', () => {
    expect(getUserRadiusForTariff('free')).toBe(7)
  })

  it('comfort → 20 км', () => {
    expect(getUserRadiusForTariff('comfort')).toBe(20)
  })

  it('premium → Infinity', () => {
    expect(getUserRadiusForTariff('premium')).toBe(Infinity)
  })
})
