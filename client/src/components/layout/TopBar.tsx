import { useState, useEffect, useRef } from 'react';
import { Bell, Search, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { api } from '../../lib/api';
import type { Notification } from '../../types';
import { useSocket } from '../../contexts/SocketContext';
import { formatTime } from '../../lib/utils';
import { MemberSearch } from '../search/MemberSearch';

export function TopBar({ title, onToggleSidebar, sidebarCollapsed }: {
  title?: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const { socket } = useSocket();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<Notification[]>('/notifications').then(ns => {
      setNotifications(ns);
      setUnread(ns.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification', (n: Notification) => {
      setNotifications(prev => [n, ...prev]);
      setUnread(c => c + 1);
    });
    return () => { socket.off('notification'); };
  }, [socket]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnread(0);
    }
  };

  return (
    <>
    <header className="min-h-14 pt-[env(safe-area-inset-top)] bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-10">
      {/* Desktop sidebar toggle */}
      {onToggleSidebar && (
        <button onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Hiện sidebar' : 'Ẩn sidebar'}
          className="hidden md:flex p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 items-center justify-center">
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      )}
      {title && <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{title}</h2>}
      <div className="flex-1" />

      <button onClick={() => setShowSearch(true)}
        className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
        title="Tìm thành viên">
        <Search size={20} />
      </button>

      <div className="relative" ref={dropRef}>
        <button onClick={handleOpen}
          className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Bell size={22} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Thông báo</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">Chưa có thông báo</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors ${!n.read ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
    <MemberSearch open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
