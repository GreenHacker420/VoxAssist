'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinCall: (callId: string) => void
  leaveCall: (callId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      })

      socketInstance.on('connect', () => {
        setConnected(true)
        console.log('Connected to WebSocket server')
      })

      socketInstance.on('disconnect', () => {
        setConnected(false)
        console.log('Disconnected from WebSocket server')
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [user])

  const joinCall = (callId: string) => {
    if (socket) {
      socket.emit('join-call', callId)
    }
  }

  const leaveCall = (callId: string) => {
    if (socket) {
      socket.emit('leave-call', callId)
    }
  }

  const value = {
    socket,
    connected,
    joinCall,
    leaveCall,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
