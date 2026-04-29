import { useState, useEffect } from 'react'
import { Card } from '../components/Card'
import type { FeedSlot } from '@beauty/shared'

const MOCK_API = 'http://localhost:3000/api/feed?lat=59.93&lon=30.31&radius=20&page=1&limit=10'

export function Feed({ onCardClick }: { onCardClick: (id: string) => void }) {
  const [slots, setSlots] = useState<FeedSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(MOCK_API)
      .then((r) => r.json())
      .then((d) => setSlots(d.data ?? []))
      .catch(() => {
        // Fallback: пустая лента
        setSlots([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light">Ореол</h1>
        <span className="text-sm text-dark/40">📍 Санкт-Петербург</span>
      </header>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-cream/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {slots.map((slot) => (
          <Card key={slot.id} slot={slot} onClick={() => onCardClick(slot.id)} />
        ))}
      </div>

      {!loading && slots.length === 0 && (
        <p className="text-center text-dark/40 mt-12">Предложений пока нет. Загляните позже.</p>
      )}
    </div>
  )
}
