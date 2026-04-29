import type { FeedSlot } from '@beauty/shared'

const CATEGORY_COLORS: Record<string, string> = {
  hair: '#D4A0A0',
  nails: '#C9A96E',
  massage: '#B7C4B0',
  spa: '#9AB5C1',
  cosmetology: '#C4A0D4',
  yoga: '#A0C4B7',
}

export function Card({ slot, onClick }: { slot: FeedSlot; onClick: () => void }) {
  const saved = Math.round(slot.basePrice - slot.finalPrice)
  const discountPct = Math.round((1 - slot.finalPrice / slot.basePrice) * 100)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: CATEGORY_COLORS[slot.studio.category] ?? '#888' }}
        >
          {slot.studio.category}
        </span>
        <span className="text-sm text-dark/40">{slot.studio.name}</span>
      </div>

      <h3 className="text-lg font-medium mb-1">{slot.service.title}</h3>
      <p className="text-sm text-dark/50 mb-3">
        {new Date(slot.datetime).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
        {' · '}{slot.service.durationMin} мин
        {slot.studio.rating && ` · ★ ${slot.studio.rating}`}
      </p>

      <div className="flex items-baseline gap-2">
        <span className="text-sm line-through text-dark/30">{slot.basePrice}₽</span>
        <span className="text-xl font-medium text-rose">{slot.finalPrice}₽</span>
        <span className="text-sm text-rose">−{discountPct}%</span>
      </div>

      <div className="flex justify-between text-xs text-dark/40 mt-2">
        <span>📍 {slot.distanceKm} км</span>
        <span>💰 выгода {saved}₽</span>
      </div>
    </div>
  )
}
