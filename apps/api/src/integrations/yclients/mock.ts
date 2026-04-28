import type {
  StaffMember,
  YCService,
  TimeSlot,
  BookingRequest,
  BookingResponse,
  YCCompany,
} from './client'

export const MOCK_STAFF: StaffMember[] = [
  {
    id: 1,
    name: 'Анна Смирнова',
    bookable: true,
    specialization: 'Стилист',
    position: { id: 1, title: 'Мастер' },
    weight: 100,
  },
  {
    id: 2,
    name: 'Мария Иванова',
    bookable: true,
    specialization: 'Мастер маникюра',
    position: { id: 2, title: 'Мастер' },
    weight: 90,
  },
]

export const MOCK_SERVICES: YCService[] = [
  {
    id: 101,
    title: 'Стрижка женская',
    cost: 3000,
    price: 3000,
    duration: 3600,
    category: 'Волосы',
    description: 'Профессиональная женская стрижка',
  },
  {
    id: 102,
    title: 'Маникюр классический',
    cost: 1500,
    price: 1500,
    duration: 2700,
    category: 'Ногти',
    description: 'Классический маникюр с покрытием',
  },
]

export const MOCK_TIME_SLOTS: TimeSlot[] = [
  { time: '10:00', seance_length: 3600, datetime: '2026-04-28T10:00:00+03:00' },
  { time: '12:00', seance_length: 3600, datetime: '2026-04-28T12:00:00+03:00' },
  { time: '15:00', seance_length: 3600, datetime: '2026-04-28T15:00:00+03:00' },
  { time: '17:00', seance_length: 3600, datetime: '2026-04-28T17:00:00+03:00' },
]

export const MOCK_COMPANY: YCCompany = {
  id: 123456,
  title: 'Devi Studio',
  address: 'Москва, Тверская, 1',
  phone: '+74951234567',
}

export class MockYClientsClient {
  async getStaff() {
    return { success: true, data: MOCK_STAFF }
  }

  async getStaffInfo(staffId: number) {
    const staff = MOCK_STAFF.find((s) => s.id === staffId)
    if (!staff) throw new Error(`Staff ${staffId} not found`)
    return { success: true, data: staff }
  }

  async getServices() {
    return { success: true, data: MOCK_SERVICES }
  }

  async getServiceInfo(serviceId: number) {
    const service = MOCK_SERVICES.find((s) => s.id === serviceId)
    if (!service) throw new Error(`Service ${serviceId} not found`)
    return { success: true, data: service }
  }

  async getAvailableDays() {
    return { success: true, data: ['2026-04-28', '2026-04-29', '2026-04-30'] }
  }

  async getAvailableTimes(_staffId: number, _day: string) {
    return { success: true, data: MOCK_TIME_SLOTS }
  }

  async createBooking(req: BookingRequest): Promise<BookingResponse> {
    return {
      success: true,
      data: {
        id: Math.floor(Math.random() * 100000),
      },
    }
  }

  async getCompany() {
    return { success: true, data: MOCK_COMPANY }
  }

  async getClients(page = 1, count = 200) {
    return {
      success: true,
      data: [],
      meta: { total_count: 0 },
    }
  }
}
