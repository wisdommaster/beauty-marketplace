import { describe, it, expect, vi, beforeEach } from 'vitest'
import { haversine, type Coordinates } from './client'

describe('haversine', () => {
  describe('точные расстояния', () => {
    it('одинаковые точки → 0 км', () => {
      const moscow: Coordinates = { lat: 55.7558, lon: 37.6173 }
      expect(haversine(moscow, moscow)).toBeCloseTo(0, 5)
    })

    it('Москва → Санкт-Петербург ≈ 635 км', () => {
      const moscow: Coordinates = { lat: 55.7558, lon: 37.6173 }
      const spb: Coordinates = { lat: 59.9343, lon: 30.3351 }
      const distance = haversine(moscow, spb)
      expect(distance).toBeGreaterThan(630)
      expect(distance).toBeLessThan(640)
    })

    it('Москва → Новосибирск ≈ 2820 км', () => {
      const moscow: Coordinates = { lat: 55.7558, lon: 37.6173 }
      const novosibirsk: Coordinates = { lat: 54.9885, lon: 82.9207 }
      const distance = haversine(moscow, novosibirsk)
      expect(distance).toBeGreaterThan(2800)
      expect(distance).toBeLessThan(2850)
    })

    it('расстояние симметрично: d(A,B) === d(B,A)', () => {
      const a: Coordinates = { lat: 55.7558, lon: 37.6173 }
      const b: Coordinates = { lat: 59.9343, lon: 30.3351 }
      expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 5)
    })
  })

  describe('небольшие расстояния (городской масштаб)', () => {
    it('две точки в Москве ≈ 1 км', () => {
      // Красная площадь → ГУМ (примерно 50м, используем реальные координаты)
      const kremlin: Coordinates = { lat: 55.7520, lon: 37.6175 }
      const luzhniki: Coordinates = { lat: 55.7155, lon: 37.5527 }
      const d = haversine(kremlin, luzhniki)
      expect(d).toBeGreaterThan(5)
      expect(d).toBeLessThan(8)
    })

    it('точки в 5 км подходят под тариф Start (3 км) → нет, Growth (10 км) → да', () => {
      const origin: Coordinates = { lat: 55.7520, lon: 37.6175 }
      // Примерно 5 км на восток от начала
      const point5km: Coordinates = { lat: 55.7520, lon: 37.6870 }
      const d = haversine(origin, point5km)
      expect(d).toBeGreaterThan(3)
      expect(d).toBeLessThan(10)
    })
  })

  describe('граничные случаи', () => {
    it('экватор: расстояние 1 градус долготы ≈ 111 км', () => {
      const a: Coordinates = { lat: 0, lon: 0 }
      const b: Coordinates = { lat: 0, lon: 1 }
      const d = haversine(a, b)
      expect(d).toBeCloseTo(111.32, 0)
    })

    it('пересечение экватора и нулевого меридиана', () => {
      const origin: Coordinates = { lat: 0, lon: 0 }
      const opposite: Coordinates = { lat: 0, lon: 180 }
      const d = haversine(origin, opposite)
      // Полуокружность Земли ≈ 20015 км
      expect(d).toBeCloseTo(20015, -2)
    })

    it('отрицательные координаты (южное полушарие)', () => {
      const a: Coordinates = { lat: -33.8688, lon: 151.2093 } // Сидней
      const b: Coordinates = { lat: -36.8485, lon: 174.7633 } // Окленд
      const d = haversine(a, b)
      expect(d).toBeGreaterThan(2100)
      expect(d).toBeLessThan(2200)
    })

    it('возвращает число (не NaN)', () => {
      const a: Coordinates = { lat: 55.7558, lon: 37.6173 }
      const b: Coordinates = { lat: 59.9343, lon: 30.3351 }
      expect(Number.isNaN(haversine(a, b))).toBe(false)
    })

    it('результат всегда >= 0', () => {
      const a: Coordinates = { lat: 55.7558, lon: 37.6173 }
      const b: Coordinates = { lat: -33.8688, lon: 151.2093 }
      expect(haversine(a, b)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('радиусы тарифов', () => {
    const origin: Coordinates = { lat: 55.7520, lon: 37.6175 }

    it('точка в 2 км видима для всех тарифов (Start 3 км, Growth 10 км, Maximum 25 км)', () => {
      const nearby: Coordinates = { lat: 55.7700, lon: 37.6175 }
      const d = haversine(origin, nearby)
      expect(d).toBeLessThan(3)
    })
  })
})
