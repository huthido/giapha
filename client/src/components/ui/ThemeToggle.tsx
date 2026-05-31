import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Chuyển sáng' : 'Chuyển tối'}
      className={`p-2 rounded-xl transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 ${className}`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
