/**
 * YClients API Client
 * 
 * Основан на: YClients REST API v2.0 (документация Apiary)
 * Реализация: Python wrapper yclients-api (CoolmixZero)
 * 
 * Эндпоинты:
 * - book_staff    → GET список мастеров
 * - book_services → GET список услуг
 * - book_dates    → GET доступные дни
 * - book_times    → GET доступные слоты
 * - book_record   → POST создать бронь
 * - clients       → GET список клиентов
 * - company       → GET информация о компании
 */

export interface YClientsConfig {
  token: string;        // Bearer token
  companyId: number;    // Company ID
  formId: number;       // Form ID (обычно = companyId)
  baseUrl?: string;     // По умолчанию: n{formId}.yclients.com
}

export interface StaffMember {
  id: number;
  name: string;
  bookable: boolean;
  specialization?: string;
  position?: { id: number; title: string };
  avatar?: string;
  weight?: number;
}

export interface YCService {
  id: number;
  title: string;
  cost?: number;
  price?: number;
  duration?: number;       // секунды
  category?: string;
  description?: string;
}

export interface TimeSlot {
  time: string;            // "09:00"
  seance_length: number;   // длительность в секундах
  datetime: string;        // ISO 8601
}

export interface BookingRequest {
  phone: string;
  fullname: string;
  email?: string;
  staffId: number;
  serviceId: number;
  datetime: string;        // ISO 8601
  comment?: string;
}

export interface BookingResponse {
  success: boolean;
  data?: {
    id: number;
    // ...другие поля
  };
  errors?: {
    message: string;
  };
}

export interface YCCompany {
  id: number;
  title: string;
  address?: string;
  phone?: string;
}

export class YClientsClient {
  private config: YClientsConfig;
  private apiBase: string;
  private formBase: string;

  constructor(config: YClientsConfig) {
    this.config = config;
    this.apiBase = 'https://api.yclients.com/api/v1';
    this.formBase = config.baseUrl || `https://n${config.formId}.yclients.com/api/v1`;
  }

  private headers(): Record<string, string> {
    return {
      'Accept': 'application/vnd.yclients.v2+json',
      'Authorization': `Bearer ${this.config.token}`,
      'Accept-Language': 'ru-RU',
      'Cache-Control': 'no-cache',
    };
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers(), ...options.headers },
    });
    if (!res.ok) {
      throw new Error(`YClients API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // ─── Бронирование ──────────────────────────────────

  /** Получить мастеров для услуги и даты */
  async getStaff(params?: { serviceId?: number; datetime?: string }) {
    const qs = new URLSearchParams();
    if (params?.serviceId) qs.append('service_ids[]', String(params.serviceId));
    if (params?.datetime) qs.append('datetime', params.datetime);
    return this.request<{ success: boolean; data: StaffMember[] }>(
      `${this.formBase}/book_staff/${this.config.companyId}?${qs}`
    );
  }

  /** Получить детали мастера */
  async getStaffInfo(staffId: number) {
    return this.request<{ success: boolean; data: StaffMember }>(
      `${this.formBase}/staff/${this.config.companyId}/${staffId}`
    );
  }

  /** Получить услуги для мастера и даты */
  async getServices(params?: { staffId?: number; datetime?: string }) {
    const qs = new URLSearchParams();
    if (params?.staffId) qs.append('staff_id', String(params.staffId));
    if (params?.datetime) qs.append('datetime', params.datetime);
    return this.request<{ success: boolean; data: YCService[] }>(
      `${this.formBase}/book_services/${this.config.companyId}?${qs}`
    );
  }

  /** Получить детали услуги */
  async getServiceInfo(serviceId: number) {
    return this.request<{ success: boolean; data: YCService }>(
      `${this.formBase}/services/${this.config.companyId}/${serviceId}`
    );
  }

  /** Получить доступные дни */
  async getAvailableDays(params?: { staffId?: number; serviceId?: number }) {
    const qs = new URLSearchParams();
    if (params?.staffId) qs.append('staff_id', String(params.staffId));
    if (params?.serviceId) qs.append('service_ids[]', String(params.serviceId));
    return this.request<{ success: boolean; data: string[] }>(
      `${this.formBase}/book_dates/${this.config.companyId}?${qs}`
    );
  }

  /** Получить доступные слоты на конкретный день */
  async getAvailableTimes(staffId: number, day: string, serviceId?: number) {
    const qs = new URLSearchParams();
    if (serviceId) qs.append('service_ids[]', String(serviceId));
    return this.request<{ success: boolean; data: TimeSlot[] }>(
      `${this.formBase}/book_times/${this.config.companyId}/${staffId}/${day}?${qs}`
    );
  }

  /** Создать бронь */
  async createBooking(req: BookingRequest) {
    return this.request<BookingResponse>(
      `${this.formBase}/book_record/${this.config.companyId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: req.phone,
          fullname: req.fullname,
          email: req.email || '',
          comment: req.comment || '',
          notify_by_email: 0,
          appointments: [{
            id: 0,
            services: [req.serviceId],
            staff_id: req.staffId,
            datetime: req.datetime,
          }],
        }),
      }
    );
  }

  /** Получить информацию о компании */
  async getCompany() {
    return this.request<{ success: boolean; data: YCCompany }>(
      `${this.apiBase}/company/${this.config.companyId}`
    );
  }

  /** Получить список клиентов (пагинация) */
  async getClients(page = 1, count = 200) {
    return this.request<{ success: boolean; data: any[]; meta: { total_count: number } }>(
      `${this.apiBase}/clients/${this.config.companyId}?page=${page}&count=${count}`
    );
  }
}
