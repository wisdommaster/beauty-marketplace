/**
 * WebSocket сервер — real-time события
 * 
 * События:
 * - slot.updated   → юзерам в ленте (статус изменился)
 * - booking.updated → пользователю и бизнесу
 */

import { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

let wss: WebSocketServer | null = null

const SESSIONS = new Map<string, Set<WebSocket>>()

export function initWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'subscribe' && msg.userId) {
          if (!SESSIONS.has(msg.userId)) SESSIONS.set(msg.userId, new Set())
          SESSIONS.get(msg.userId)!.add(ws)
        }
        if (msg.type === 'subscribe_business' && msg.businessId) {
          const key = `biz:${msg.businessId}`
          if (!SESSIONS.has(key)) SESSIONS.set(key, new Set())
          SESSIONS.get(key)!.add(ws)
        }
      } catch { /* ignore malformed */ }
    })

    ws.on('close', () => {
      for (const [key, sockets] of SESSIONS) {
        sockets.delete(ws)
        if (sockets.size === 0) SESSIONS.delete(key)
      }
    })
  })
}

function send(userId: string, data: Record<string, any>) {
  const sockets = SESSIONS.get(userId)
  if (!sockets) return
  const payload = JSON.stringify(data)
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  }
}

function broadcast(topic: string, data: Record<string, any>) {
  if (!wss) return
  const payload = JSON.stringify({ topic, ...data })
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

export function notifySlotUpdated(slotId: string, data: { bookedCount: number; capacity: number; status: string }) {
  broadcast('slot.updated', { slotId, ...data })
}

export function notifyBookingUpdated(userId: string, businessId: string, bookingId: string, status: string) {
  send(userId, { type: 'booking.updated', bookingId, status })
  send(`biz:${businessId}`, { type: 'booking.updated', bookingId, status })
}
