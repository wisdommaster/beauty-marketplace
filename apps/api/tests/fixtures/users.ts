import type { UserPublic } from '@beauty/shared'

export const MOCK_USERS: UserPublic[] = [
  {
    id: 'user-1',
    phone: '+79991234567',
    email: 'ivan@example.com',
    firstName: 'Иван',
    lastName: 'Иванов',
    tariff: 'free',
  },
  {
    id: 'user-2',
    phone: '+79997654321',
    email: 'maria@example.com',
    firstName: 'Мария',
    lastName: 'Петрова',
    tariff: 'comfort',
  },
  {
    id: 'user-3',
    phone: '+79990000001',
    email: 'premium@example.com',
    firstName: 'Алексей',
    lastName: 'Сидоров',
    tariff: 'premium',
  },
]
