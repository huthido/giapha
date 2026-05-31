import { NavLink } from 'react-router-dom';
import { Home, GitBranch, MessageCircle, Image } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

const navItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/tree', icon: GitBranch, label: 'Gia phả' },
  { to: '/chat', icon: MessageCircle, label: 'Nhắn tin' },
  { to: '/albums', icon: Image, label: 'Ảnh' },
];

interface BottomNavProps {
  onMenu: () => void;
}

const itemClass = 'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors min-h-[56px]';

export function BottomNav({ onMenu }: BottomNavProps) {
  const { user } = useAuth();

  return (
    <nav className="md:hidden flex-shrink-0 flex items-stretch bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] z-10">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `${itemClass} ${
              isActive
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <Icon size={22} />
          {label}
        </NavLink>
      ))}
      <button onClick={onMenu} className={`${itemClass} text-gray-500 dark:text-gray-400`}>
        <Avatar src={user?.avatar} name={user?.name || '?'} size="xs" />
        Tài khoản
      </button>
    </nav>
  );
}
