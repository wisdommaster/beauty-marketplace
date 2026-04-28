import { describe, it, expect } from 'vitest'
import {
  calculateDiscount,
  calculateFinalPrice,
  calculateDiscountAmount,
  computeSlotDiscount,
} from './discount.service'

describe('calculateDiscount', () => {
  describe('формула: min + (distance/radius) × (max - min)', () => {
    it('distance=0 → minDiscount', () => {
      expect(calculateDiscount(0, 25, 0.15, 0.50)).toBeCloseTo(0.15)
    })

    it('distance=maxRadius → maxDiscount', () => {
      expect(calculateDiscount(25, 25, 0.15, 0.50)).toBeCloseTo(0.50)
    })

    it('distance=50% радиуса → средняя скидка', () => {
      // 0.15 + 0.5 × 0.35 = 0.325
      expect(calculateDiscount(12.5, 25, 0.15, 0.50)).toBeCloseTo(0.325)
    })

    it('пример из ARCHITECTURE.md: 4 км из 25, 15-50%', () => {
      // 0.15 + (4/25) × 0.35 = 0.15 + 0.056 = 0.206
      expect(calculateDiscount(4, 25, 0.15, 0.50)).toBeCloseTo(0.206, 3)
    })

    it('тариф Growth: 3 км из 10, 10-35%', () => {
      // 0.10 + (3/10) × 0.25 = 0.10 + 0.075 = 0.175
      expect(calculateDiscount(3, 10, 0.10, 0.35)).toBeCloseTo(0.175)
    })

    it('тариф Start: 1.5 км из 3, 5-20%', () => {
      // 0.05 + (1.5/3) × 0.15 = 0.05 + 0.075 = 0.125
      expect(calculateDiscount(1.5, 3, 0.05, 0.20)).toBeCloseTo(0.125)
    })
  })

  describe('граничные случаи', () => {
    it('distance > maxRadius → clamp до maxDiscount', () => {
      expect(calculateDiscount(30, 25, 0.15, 0.50)).toBeCloseTo(0.50)
    })

    it('minDiscount === maxDiscount → постоянная скидка', () => {
      expect(calculateDiscount(10, 25, 0.20, 0.20)).toBeCloseTo(0.20)
      expect(calculateDiscount(0, 25, 0.20, 0.20)).toBeCloseTo(0.20)
    })

    it('нулевая скидка: minDiscount=0, maxDiscount=0', () => {
      expect(calculateDiscount(5, 25, 0, 0)).toBeCloseTo(0)
    })

    it('максимальная скидка 100%', () => {
      expect(calculateDiscount(25, 25, 0, 1)).toBeCloseTo(1)
    })
  })

  describe('валидация аргументов', () => {
    it('отрицательное расстояние → RangeError', () => {
      expect(() => calculateDiscount(-1, 25, 0.15, 0.50)).toThrow(RangeError)
    })

    it('нулевой радиус → RangeError', () => {
      expect(() => calculateDiscount(5, 0, 0.15, 0.50)).toThrow(RangeError)
    })

    it('отрицательный радиус → RangeError', () => {
      expect(() => calculateDiscount(5, -10, 0.15, 0.50)).toThrow(RangeError)
    })

    it('minDiscount < 0 → RangeError', () => {
      expect(() => calculateDiscount(5, 25, -0.1, 0.50)).toThrow(RangeError)
    })

    it('maxDiscount > 1 → RangeError', () => {
      expect(() => calculateDiscount(5, 25, 0.15, 1.1)).toThrow(RangeError)
    })

    it('minDiscount > maxDiscount → RangeError', () => {
      expect(() => calculateDiscount(5, 25, 0.50, 0.15)).toThrow(RangeError)
    })
  })

  describe('все тарифы на одинаковом расстоянии дают разную скидку', () => {
    const distance = 5

    it('Start (3 км) — уже за пределами радиуса, clamp к max', () => {
      expect(calculateDiscount(distance, 3, 0.05, 0.20)).toBeCloseTo(0.20)
    })

    it('Growth (10 км) — в радиусе, промежуточная скидка', () => {
      // 0.10 + (5/10) × 0.25 = 0.225
      expect(calculateDiscount(distance, 10, 0.10, 0.35)).toBeCloseTo(0.225)
    })

    it('Maximum (25 км) — в радиусе, меньшая скидка чем Growth при 5 км', () => {
      // 0.15 + (5/25) × 0.35 = 0.15 + 0.07 = 0.22
      expect(calculateDiscount(distance, 25, 0.15, 0.50)).toBeCloseTo(0.22)
    })
  })
})

describe('calculateFinalPrice', () => {
  it('base 5000, скидка 20.6% → 3970', () => {
    expect(calculateFinalPrice(5000, 0.206)).toBe(3970)
  })

  it('base 5000, скидка 0% → 5000', () => {
    expect(calculateFinalPrice(5000, 0)).toBe(5000)
  })

  it('base 5000, скидка 100% → 0', () => {
    expect(calculateFinalPrice(5000, 1)).toBe(0)
  })

  it('base 5000, скидка 50% → 2500', () => {
    expect(calculateFinalPrice(5000, 0.50)).toBe(2500)
  })

  it('base 0 → 0', () => {
    expect(calculateFinalPrice(0, 0.30)).toBe(0)
  })

  it('отрицательная цена → RangeError', () => {
    expect(() => calculateFinalPrice(-100, 0.20)).toThrow(RangeError)
  })

  it('скидка вне диапазона [0,1] → RangeError', () => {
    expect(() => calculateFinalPrice(5000, 1.5)).toThrow(RangeError)
  })
})

describe('calculateDiscountAmount', () => {
  it('base 5000, скидка 20% → 1000', () => {
    expect(calculateDiscountAmount(5000, 0.20)).toBe(1000)
  })

  it('base 3000, скидка 15% → 450', () => {
    expect(calculateDiscountAmount(3000, 0.15)).toBe(450)
  })
})

describe('computeSlotDiscount (интеграция формулы)', () => {
  it('пример из ARCHITECTURE.md: Maximum 4 км, цена 5000', () => {
    const result = computeSlotDiscount(5000, 4, 25, 0.15, 0.50)
    expect(result.discountPercent).toBeCloseTo(0.206, 3)
    expect(result.finalPrice).toBe(3970)
    expect(result.discountAmount).toBe(1030)
  })

  it('Growth тариф: 0 км (студия рядом), цена 2000', () => {
    const result = computeSlotDiscount(2000, 0, 10, 0.10, 0.35)
    expect(result.discountPercent).toBeCloseTo(0.10)
    expect(result.finalPrice).toBe(1800)
    expect(result.discountAmount).toBe(200)
  })

  it('Maximum тариф: максимальное расстояние, цена 5000', () => {
    const result = computeSlotDiscount(5000, 25, 25, 0.15, 0.50)
    expect(result.discountPercent).toBeCloseTo(0.50)
    expect(result.finalPrice).toBe(2500)
    expect(result.discountAmount).toBe(2500)
  })
})
