'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { WebSocketEvent } from '@/types/complaint'

/**
 * Smart WebSocket base URL detection (same logic as API_BASE_URL in api-client.ts):
 *
 * 1. If NEXT_PUBLIC_WS_BASE_URL is explicitly set → use it (highest priority)
 * 2. If running on the preview server (not localhost) → connect directly to ws://localhost:8000
 * 3. If running locally → also use ws://localhost:8000 (default)
 */
const WS_BASE_URL: string = (() => {
  const envUrl = process.env.NEXT_PUBLIC_WS_BASE_URL
  if (envUrl !== undefined && envUrl !== '') return envUrl
  // Both local and preview: WebSocket always connects directly to the backend
  return 'ws://localhost:8000/api/v1'
})()
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 5

interface UseWebSocketOptions {
  onEvent?: (event: WebSocketEvent) => void
  reconnect?: boolean
}

export function useWebSocket(path: string, options: UseWebSocketOptions = {}) {
  const { onEvent, reconnect = true } = options
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED)
  const [events, setEvents] = useState<WebSocketEvent[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  const connectRef = useRef<() => void>(() => {})
  // eslint-disable-next-line react-hooks/refs
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `${WS_BASE_URL}${path}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setReadyState(WebSocket.OPEN)
      reconnectAttemptsRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent
        setLastMessage(data)
        setEvents((prev) => [...prev.slice(-99), data])
        onEventRef.current?.(data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED)
      if (reconnect && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1
        reconnectTimerRef.current = setTimeout(() => connectRef.current(), RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [path, reconnect])

  // eslint-disable-next-line react-hooks/refs
  connectRef.current = connect

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return {
    lastMessage,
    events,
    sendMessage,
    readyState,
    isConnected: readyState === WebSocket.OPEN,
  }
}
