import { CATEGORIES } from '@beauty/shared'

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-5xl font-light text-dark mb-4">Ореол</h1>
      <p className="text-xl text-dark/70 mb-2">красота в твоём радиусе</p>
      <p className="text-dark/50 max-w-md mb-8">
        Свободные места в салонах, спа и студиях рядом с тобой.
        Цена зависит от расстояния — чем дальше, тем выгоднее.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {CATEGORIES.slice(0, 6).map((c) => (
          <span key={c} className="px-3 py-1 bg-rose/10 text-rose rounded-full text-sm">
            {c}
          </span>
        ))}
      </div>

      <button
        onClick={onEnter}
        className="px-8 py-3 bg-dark text-cream rounded-full text-lg hover:bg-dark/80 transition-colors"
      >
        Смотреть предложения
      </button>

      <div className="mt-16 grid grid-cols-3 gap-8 text-sm text-dark/40 max-w-md">
        <div className="text-center">
          <div className="text-2xl mb-1">📍</div>
          <div>Выбери услугу рядом</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">💫</div>
          <div>Цена зависит от расстояния</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">✨</div>
          <div>Бронь в одно нажатие</div>
        </div>
      </div>
    </div>
  )
}
