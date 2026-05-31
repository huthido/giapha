import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className={`
        relative bg-white dark:bg-gray-900 shadow-xl w-full ${sizes[size]}
        max-h-[92dvh] sm:max-h-[88dvh] flex flex-col
        border border-gray-100 dark:border-gray-800
        rounded-t-3xl sm:rounded-2xl
      `}>
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <button onClick={onClose}
              className="p-2 -mr-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
