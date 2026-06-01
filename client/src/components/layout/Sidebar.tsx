import { NavLink } from 'react-router-dom';
import { Home, GitBranch, MessageCircle, Image, CalendarDays, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useSocket } from '../../contexts/SocketContext';

const navItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/tree', icon: GitBranch, label: 'Gia phả' },
  { to: '/events', icon: CalendarDays, label: 'Sự kiện' },
  { to: '/chat', icon: MessageCircle, label: 'Nhắn tin' },
  { to: '/albums', icon: Image, label: 'Ảnh' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export function Sidebar({ open, onClose, collapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const items = user?.role === 'admin'
    ? [...navItems, { to: '/admin', icon: Shield, label: 'Quản lý' }]
    : navItems;

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-20 md:hidden transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed left-0 top-0 h-[100dvh] w-64 pt-[env(safe-area-inset-top)] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-30 shadow-sm transition-transform duration-200 ${
          collapsed ? 'md:-translate-x-full' : 'md:translate-x-0'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
              <GitBranch size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">Gia Phả</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">Kết nối gia đình</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1.5 transition-colors text-sm font-medium min-h-[48px] ${
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <NavLink to={`/profile/${user.id}`} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-1">
              <Avatar src={user.avatar} name={user.name} size="sm" online={onlineUsers.has(user.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
              </div>
            </NavLink>
            <div className="flex gap-1">
              <ThemeToggle className="flex-1" />
              <button onClick={logout}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm whitespace-nowrap min-w-0">
                <LogOut size={15} className="shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
