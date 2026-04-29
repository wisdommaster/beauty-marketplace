export function CardDetail({ slotId, onBack }: { slotId: string; onBack: () => void }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={onBack} className="text-dark/40 mb-4">← Назад</button>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-medium mb-4">Детали предложения</h2>
        <p className="text-dark/50">Загрузка слота {slotId}...</p>
      </div>
    </div>
  )
}
