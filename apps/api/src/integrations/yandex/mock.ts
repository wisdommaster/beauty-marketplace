import type { YandexMapsConfig, GeocoderResult, PlaceRating, Coordinates } from './client'
import { haversine } from './client'

export class MockYandexMapsClient {
  private readonly addresses: Record<string, GeocoderResult> = {
    'Москва, Тверская, 1': {
      coordinates: { lat: 55.7601, lon: 37.6178 },
      address: 'Россия, Москва, Тверская улица, 1',
      precision: 'exact',
    },
    'Москва, Арбат, 1': {
      coordinates: { lat: 55.7494, lon: 37.5945 },
      address: 'Россия, Москва, Арбат, 1',
      precision: 'exact',
    },
    'Москва, Новый Арбат, 15': {
      coordinates: { lat: 55.7517, lon: 37.5882 },
      address: 'Россия, Москва, Новый Арбат, 15',
      precision: 'exact',
    },
  }

  async geocode(address: string): Promise<GeocoderResult> {
    const result = this.addresses[address]
    if (!result) {
      return {
        coordinates: { lat: 55.7522, lon: 37.6156 },
        address,
        precision: 'other',
      }
    }
    return result
  }

  async reverseGeocode(coords: Coordinates): Promise<GeocoderResult> {
    return {
      coordinates: coords,
      address: `Россия, Москва, ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
      precision: 'near',
    }
  }

  async getPlaceRating(name: string, _address: string): Promise<PlaceRating | null> {
    const ratings: Record<string, PlaceRating> = {
      'Devi Studio': { rating: 4.8, reviewsCount: 124 },
      'Top Face': { rating: 4.6, reviewsCount: 89 },
      'Top Nails': { rating: 4.5, reviewsCount: 67 },
    }
    return ratings[name] ?? null
  }

  buildRouteLink(from: Coordinates, to: Coordinates, mode: 'auto' | 'pedestrian' | 'taxi'): string {
    const rtt = mode === 'pedestrian' ? 'pd' : mode === 'taxi' ? 'mt' : 'auto'
    return `https://yandex.ru/maps/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${rtt}`
  }

  buildMobileRouteLink(from: Coordinates, to: Coordinates, mode: 'auto' | 'pedestrian' | 'taxi'): string {
    const rtt = mode === 'pedestrian' ? 'pd' : mode === 'taxi' ? 'mt' : 'auto'
    return `yandexmaps://maps.yandex.ru/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${rtt}`
  }

  getDistanceKm(from: Coordinates, to: Coordinates): number {
    return haversine(from, to)
  }
}
