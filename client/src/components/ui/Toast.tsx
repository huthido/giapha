import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }
interface ToastContextType { showToast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
let uid = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++uid;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const colors = {
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm ${colors[toast.type]} max-w-sm`}>
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() { return useContext(ToastContext); }
