import { useState } from 'react'
import { Landing } from './pages/Landing'
import { Feed } from './pages/Feed'
import { CardDetail } from './pages/CardDetail'
import { Bookings } from './pages/Bookings'
import { Profile } from './pages/Profile'

type Page = 'landing' | 'feed' | 'card' | 'bookings' | 'profile'

export function App() {
  const [page, setPage] = useState<Page>('landing')
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const navigate = (p: Page, slotId?: string) => {
    setPage(p)
    if (slotId) setSelectedSlotId(slotId)
  }

  return (
    <div className="min-h-screen bg-cream">
      {page === 'landing' && <Landing onEnter={() => navigate('feed')} />}
      {page === 'feed' && <Feed onCardClick={(id) => navigate('card', id)} />}
      {page === 'card' && selectedSlotId && <CardDetail slotId={selectedSlotId} onBack={() => navigate('feed')} />}
      {page === 'bookings' && <Bookings />}
      {page === 'profile' && <Profile />}
    </div>
  )
}
