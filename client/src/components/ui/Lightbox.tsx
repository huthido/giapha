import { useEffect } from 'react';
import { X } from 'lucide-react';

interface LightboxProps {
  src: string | null;
  onClose: () => void;
}

export function Lightbox({ src, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (src) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white" onClick={onClose}>
        <X size={24} />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
