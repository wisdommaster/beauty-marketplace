/**
 * Yandex Maps API Client
 * 
 * API-ключ: Геокодер + JavaScript API
 * 
 * Эндпоинты:
 * - Geocoder: прямой/обратный геокодинг
 * - Places: информация об организации, рейтинг
 * - Static Maps: статическая карта (для карточек)
 * - JS API: интерактивная карта (на фронте)
 */

export interface YandexMapsConfig {
  apiKey: string;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GeocoderResult {
  coordinates: Coordinates;
  address: string;
  precision: 'exact' | 'number' | 'near' | 'range' | 'street' | 'other';
}

export interface PlaceRating {
  rating: number;       // 1-5
  reviewsCount: number;
}

/** Haversine formula: расстояние между двумя точками в км */
export function haversine(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export class YandexMapsClient {
  private config: YandexMapsConfig;
  private geocoderBase = 'https://geocode-maps.yandex.ru/1.x';

  constructor(config: YandexMapsConfig) {
    this.config = config;
  }

  /** Прямой геокодинг: адрес → координаты */
  async geocode(address: string): Promise<GeocoderResult> {
    const url = `${this.geocoderBase}/?apikey=${this.config.apiKey}&geocode=${encodeURIComponent(address)}&format=json&results=1`;
    const res = await fetch(url);
    const data = await res.json() as any;

    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!geoObject) throw new Error(`Address not found: ${address}`);

    const [lon, lat] = geoObject.Point.pos.split(' ').map(Number);
    return {
      coordinates: { lat, lon },
      address: geoObject.metaDataProperty?.GeocoderMetaData?.text || address,
      precision: geoObject.metaDataProperty?.GeocoderMetaData?.precision || 'other',
    };
  }

  /** Обратный геокодинг: координаты → адрес */
  async reverseGeocode(coords: Coordinates): Promise<GeocoderResult> {
    const url = `${this.geocoderBase}/?apikey=${this.config.apiKey}&geocode=${coords.lon},${coords.lat}&format=json&results=1&kind=house&sco=latlong`;
    const res = await fetch(url);
    const data = await res.json() as any;

    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!geoObject) throw new Error(`Address not found for [${coords.lat}, ${coords.lon}]`);

    return {
      coordinates: coords,
      address: geoObject.metaDataProperty?.GeocoderMetaData?.text || `${coords.lat}, ${coords.lon}`,
      precision: geoObject.metaDataProperty?.GeocoderMetaData?.precision || 'other',
    };
  }

  /** Рейтинг организации из Яндекс.Карт (через поиск по названию + адресу) */
  async getPlaceRating(name: string, address: string): Promise<PlaceRating | null> {
    try {
      const url = `${this.geocoderBase}/?apikey=${this.config.apiKey}&geocode=${encodeURIComponent(`${name}, ${address}`)}&format=json&results=1&kind=biz&lang=ru_RU`;
      const res = await fetch(url);
      const data = await res.json() as any;

      const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      if (!geoObject) return null;

      const meta = geoObject.metaDataProperty?.GeocoderMetaData;
      if (meta?.kind !== 'biz') return null;

      // Рейтинг из метаданных организации
      const rating = meta?.bizMetadata?.rating;
      const reviews = meta?.bizMetadata?.reviewsCount;

      if (rating) {
        return { rating, reviewsCount: reviews || 0 };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Deeplink для построения маршрута в Яндекс.Картах */
  buildRouteLink(
    from: Coordinates,
    to: Coordinates,
    mode: 'auto' | 'pedestrian' | 'taxi'
  ): string {
    const base = 'https://yandex.ru/maps';
    const rtt = mode === 'pedestrian' ? 'pd' : mode === 'taxi' ? 'mt' : 'auto';
    return `${base}/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${rtt}`;
  }

  /** Deeplink для мобильного приложения Яндекс.Карты */
  buildMobileRouteLink(
    from: Coordinates,
    to: Coordinates,
    mode: 'auto' | 'pedestrian' | 'taxi'
  ): string {
    const rtt = mode === 'pedestrian' ? 'pd' : mode === 'taxi' ? 'mt' : 'auto';
    return `yandexmaps://maps.yandex.ru/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${rtt}`;
  }
}
