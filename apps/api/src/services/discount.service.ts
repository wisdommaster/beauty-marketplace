/**
 * Формула: discount = minDiscount + (distance / maxRadius) × (maxDiscount - minDiscount)
 * Все дроби нормализованы: 0.05 = 5%, 0.50 = 50%
 */
export function calculateDiscount(
  distanceKm: number,
  maxRadiusKm: number,
  minDiscount: number,
  maxDiscount: number,
): number {
  if (distanceKm < 0) throw new RangeError('distanceKm must be >= 0')
  if (maxRadiusKm <= 0) throw new RangeError('maxRadiusKm must be > 0')
  if (minDiscount < 0 || minDiscount > 1) throw new RangeError('minDiscount must be in [0, 1]')
  if (maxDiscount < 0 || maxDiscount > 1) throw new RangeError('maxDiscount must be in [0, 1]')
  if (minDiscount > maxDiscount) throw new RangeError('minDiscount must be <= maxDiscount')

  const ratio = Math.min(distanceKm / maxRadiusKm, 1)
  return minDiscount + ratio * (maxDiscount - minDiscount)
}

export function calculateFinalPrice(basePrice: number, discount: number): number {
  if (basePrice < 0) throw new RangeError('basePrice must be >= 0')
  if (discount < 0 || discount > 1) throw new RangeError('discount must be in [0, 1]')
  return Math.round(basePrice * (1 - discount))
}

export function calculateDiscountAmount(basePrice: number, discount: number): number {
  return Math.round(basePrice * discount)
}

export interface DiscountResult {
  discountPercent: number
  discountAmount: number
  finalPrice: number
}

export function computeSlotDiscount(
  basePrice: number,
  distanceKm: number,
  maxRadiusKm: number,
  minDiscount: number,
  maxDiscount: number,
): DiscountResult {
  const discount = calculateDiscount(distanceKm, maxRadiusKm, minDiscount, maxDiscount)
  return {
    discountPercent: discount,
    discountAmount: calculateDiscountAmount(basePrice, discount),
    finalPrice: calculateFinalPrice(basePrice, discount),
  }
}
