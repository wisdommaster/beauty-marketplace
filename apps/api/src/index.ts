import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth.routes'
import { bookingRoutes } from './routes/booking.routes'
import { businessRoutes } from './routes/business.routes'
import { adminRoutes } from './routes/admin.routes'

const app = new Hono()

app.use('*', cors())

app.get('/api/health', (c) =>
  c.json({ status: 'ok', version: '0.0.1' }),
)

app.route('/api/auth', authRoutes)
app.route('/api/bookings', bookingRoutes)
app.route('/api/business', businessRoutes)
app.route('/api/admin', adminRoutes)

export { app }
export default app
