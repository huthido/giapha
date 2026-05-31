import { useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Send, Image } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onFiles: (files: File[]) => void;
}

export function ChatInput({ value, onChange, onSend, onFiles }: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors"
        >
          <Image size={18} />
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600"
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
