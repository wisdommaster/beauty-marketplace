/**
 * YClients Sync Service
 * 
 * Синхронизация расписания из YClients в платформу.
 * 
 * Full sync: раз в 15 минут (все слоты на +48ч)
 * Incremental: раз в 60 секунд (статусы текущих слотов)
 */

import { YClientsClient, TimeSlot } from './client';

export interface SyncSlot {
  yclientsSlotId: string;       // составной: staff_service_day_time
  studioId: number;
  staffId: number;
  staffName: string;
  serviceId: number;
  serviceTitle: string;
  servicePrice: number;
  serviceDuration: number;      // минуты
  date: string;                 // "2026-04-28"
  time: string;                 // "09:00"
  datetime: string;             // ISO 8601
  capacity: number;             // требуется ручная установка бизнесом
  bookedCount: number;          // из поллинга статусов
  isAvailable: boolean;
}

export interface SyncResult {
  studioId: number;
  slots: SyncSlot[];
  errors: string[];
  syncedAt: Date;
}

export interface SyncStatus {
  lastFullSync: Date | null;
  lastIncrementalSync: Date | null;
  activeSlots: number;
  bookedSlots: number;
  errors: string[];
  nextFullSyncIn: number;       // секунд до следующего full sync
}

// ─── Tracking Plan Implementation ───────────────────

export interface YClientsIntegrationStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  blockedBy?: string;
  dependsOn?: string[];
  completedAt?: Date;
  notes?: string;
}

/**
 * Трекер выполнения плана интеграции YClients.
 * Все шаги должны быть выполнены ДО регистрации ИП и контакта с YClients.
 */
export const YCLIENTS_INTEGRATION_PLAN: YClientsIntegrationStep[] = [
  {
    id: '1', name: 'Изучить документацию YClients API v2.0 (Apiary)',
    status: 'done',
    completedAt: new Date('2026-04-28'),
    notes: 'Документация изучена. Основные эндпоинты определены. Python wrapper проанализирован.'
  },
  {
    id: '2', name: 'Реализовать TypeScript-клиент YClients API',
    status: 'done',
    dependsOn: ['1'],
    completedAt: new Date('2026-04-28'),
    notes: 'Клиент реализован в apps/api/src/integrations/yclients/client.ts'
  },
  {
    id: '3', name: 'Спроектировать схему БД для слотов и броней',
    status: 'in_progress',
    dependsOn: ['1', '2'],
    notes: 'Проектирование начато. Таблицы: studios, services, staff, slots, bookings'
  },
  {
    id: '4', name: 'Реализовать sync worker (full sync)',
    status: 'pending',
    dependsOn: ['2', '3'],
    notes: 'Полная синхронизация всех слотов на +48ч. Интервал: 15 мин.'
  },
  {
    id: '5', name: 'Реализовать sync worker (incremental)',
    status: 'pending',
    dependsOn: ['4'],
    notes: 'Инкрементальное обновление статусов. Интервал: 60 сек.'
  },
  {
    id: '6', name: 'Реализовать auto-mapping: capacity → формат',
    status: 'pending',
    dependsOn: ['3'],
    notes: 'Авто-определение индивидуальное/групповое по capacity'
  },
  {
    id: '7', name: 'Реализовать ручное обогащение услуг бизнесом',
    status: 'pending',
    dependsOn: ['3', '6'],
    notes: 'UI для маппинга услуг на категории платформы'
  },
  {
    id: '8', name: 'Реализовать публикацию слота в ленту',
    status: 'pending',
    dependsOn: ['5', '7'],
    notes: 'Флоу: бизнес выбирает слот → настраивает радиус/скидку → публикует'
  },
  {
    id: '9', name: 'Реализовать create_booking через YClients API',
    status: 'pending',
    dependsOn: ['2'],
    notes: 'Создание брони в YClients при подтверждении на платформе'
  },
  {
    id: '10', name: 'Написать тесты на mock-данных (без реального ключа)',
    status: 'pending',
    dependsOn: ['2', '3'],
    notes: 'Полное покрытие синхронизации и бронирования на моках'
  },
  {
    id: '11', name: 'Интеграционное тестирование с реальным API-ключом',
    status: 'blocked',
    dependsOn: ['10'],
    blockedBy: 'YClients API ключи (ожидание от студий)',
    notes: 'Нужны ключи Devi, Top Face, Top Nails'
  },
  {
    id: '12', name: 'Стресс-тест: 100 одновременных бронирований',
    status: 'pending',
    dependsOn: ['11'],
    notes: 'Race condition protection: FOR UPDATE, idempotency key'
  },
];

// ─── Sync Engine (заглушка — полная реализация в процессе) ───

export class YClientsSyncService {
  private client: YClientsClient;
  private status: SyncStatus;
  private fullSyncInterval = 15 * 60 * 1000;  // 15 минут
  private incrementalInterval = 60 * 1000;     // 60 секунд
  private fullSyncTimer: ReturnType<typeof setInterval> | null = null;
  private incrementalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(client: YClientsClient) {
    this.client = client;
    this.status = {
      lastFullSync: null,
      lastIncrementalSync: null,
      activeSlots: 0,
      bookedSlots: 0,
      errors: [],
      nextFullSyncIn: 900,
    };
  }

  async fullSync(): Promise<SyncResult> {
    const errors: string[] = [];
    const slots: SyncSlot[] = [];

    try {
      // 1. Получить всех мастеров
      const staffRes = await this.client.getStaff();
      if (!staffRes.success) throw new Error('Failed to get staff');
      const staff = staffRes.data;

      // 2. Получить все услуги
      const servicesRes = await this.client.getServices();
      if (!servicesRes.success) throw new Error('Failed to get services');
      const services = servicesRes.data;

      // 3. Получить компанию (адрес)
      const companyRes = await this.client.getCompany();
      const companyId = companyRes.data.id;

      // 4. Для каждого мастера: получить доступные дни + слоты
      for (const s of staff) {
        try {
          const daysRes = await this.client.getAvailableDays({ staffId: s.id });
          if (!daysRes.success) { errors.push(`Failed to get days for staff ${s.id}`); continue; }

          for (const day of daysRes.data.slice(0, 3)) { // +3 дня
            const timesRes = await this.client.getAvailableTimes(s.id, day);
            if (!timesRes.success) { errors.push(`Failed to get times for ${s.id} on ${day}`); continue; }

            for (const t of timesRes.data) {
              const matchingService = services.find(svc => t.seance_length === svc.duration);
              const service = matchingService || services[0];

              if (!service) continue;

              slots.push({
                yclientsSlotId: `${s.id}_${service.id}_${day}_${t.time}`,
                studioId: companyId,
                staffId: s.id,
                staffName: s.name,
                serviceId: service.id,
                serviceTitle: service.title,
                servicePrice: service.price || service.cost || 0,
                serviceDuration: Math.round((service.duration || t.seance_length) / 60),
                date: day,
                time: t.time,
                datetime: t.datetime,
                capacity: 1, // требует ручной установки
                bookedCount: 0,
                isAvailable: true,
              });
            }
          }
        } catch (e) {
          errors.push(`Staff ${s.id} sync failed: ${e}`);
        }
      }

      this.status.lastFullSync = new Date();
      this.status.activeSlots = slots.length;
    } catch (e) {
      errors.push(`Full sync failed: ${e}`);
    }

    this.status.errors = errors;
    return {
      studioId: this.client['config'].companyId,
      slots,
      errors,
      syncedAt: new Date(),
    };
  }

  async incrementalSync(activeSlotIds: string[]): Promise<Partial<SyncSlot>[]> {
    this.status.lastIncrementalSync = new Date();
    // TODO: реализовать поллинг статусов для переданных slotIds
    return [];
  }

  start() {
    this.fullSyncTimer = setInterval(() => this.fullSync(), this.fullSyncInterval);
    this.incrementalTimer = setInterval(() => {
      // incremental sync текущих активных слотов
    }, this.incrementalInterval);
  }

  stop() {
    if (this.fullSyncTimer) clearInterval(this.fullSyncTimer);
    if (this.incrementalTimer) clearInterval(this.incrementalTimer);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getIntegrationPlan(): YClientsIntegrationStep[] {
    return YCLIENTS_INTEGRATION_PLAN;
  }

  /** Прогресс интеграции в процентах */
  getIntegrationProgress(): number {
    const done = YCLIENTS_INTEGRATION_PLAN.filter(s => s.status === 'done').length;
    return Math.round((done / YCLIENTS_INTEGRATION_PLAN.length) * 100);
  }
}
