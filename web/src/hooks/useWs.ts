import { useEffect, useRef } from 'react'
import { getToken } from '../api/client'

export interface WsGraphMessage {
  type: 'graph'
  nodes: unknown[]
  edges: unknown[]
  by: string
}

export interface WsUsersMessage {
  type: 'users'
  users: string[]
}

export type WsMessage = WsGraphMessage | WsUsersMessage

interface Options {
  onGraph: (msg: WsGraphMessage) => void
  onUsers: (users: string[]) => void
}

export function useWs(opsId: string, { onGraph, onUsers }: Options) {
  const ws = useRef<WebSocket | null>(null)
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true

    function connect() {
      if (!alive.current) return
      const token = getToken() ?? ''
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(
        `${proto}://${location.host}/api/ops/${opsId}/ws?token=${encodeURIComponent(token)}`
      )
      ws.current = socket

      socket.onmessage = (ev) => {
        try {
          const msg: WsMessage = JSON.parse(ev.data)
          if (msg.type === 'graph') onGraph(msg)
          else if (msg.type === 'users') onUsers(msg.users)
        } catch {
          // ignore malformed messages
        }
      }

      socket.onclose = () => {
        if (!alive.current) return
        // reconnect after 3s on unexpected close
        reconnect.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      alive.current = false
      if (reconnect.current) clearTimeout(reconnect.current)
      ws.current?.close()
    }
  }, [opsId]) // eslint-disable-line react-hooks/exhaustive-deps
}
