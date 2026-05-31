import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: new Set() });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) { setSocket(null); return; }

    const s = io({ auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('online-users', (ids: string[]) => setOnlineUsers(new Set(ids)));
    s.on('user-online', (id: string) => setOnlineUsers(prev => new Set([...prev, id])));
    s.on('user-offline', (id: string) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(id); return n; }));

    return () => { s.disconnect(); };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
