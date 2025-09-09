import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '@/services/auth';
// import { RealTimeEvent } from '@/types';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect || !AuthService.isAuthenticated()) return;

    const token = AuthService.getToken();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://voxassist.onrender.com'
        : 'http://localhost:5000');

    socketRef.current = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      onConnect?.();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (err) => {
      const error = new Error(err.message);
      setError(error);
      onError?.(error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  const emit = (event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event: string, callback: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: unknown) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const joinRoom = (room: string) => {
    emit('join-room', room);
  };

  const leaveRoom = (room: string) => {
    emit('leave-room', room);
  };

  return {
    isConnected,
    error,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };
}
