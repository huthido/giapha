import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Photo } from '../../types';
import { Avatar } from '../ui/Avatar';
import { formatTime } from '../../lib/utils';

interface PhotoLightboxProps {
  photo: Photo | null;
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
}

export function PhotoLightbox({ photo, photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  useEffect(() => {
    if (!photo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(-1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [photo, currentIndex, photos.length]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <Avatar src={photo.uploader_avatar} name={photo.uploader_name} size="sm" />
          <div>
            <p className="text-white text-sm font-medium">{photo.uploader_name}</p>
            <p className="text-gray-400 text-xs">{formatTime(photo.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{currentIndex + 1} / {photos.length}</span>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {currentIndex > 0 && (
          <button onClick={() => onNavigate(-1)}
            className="absolute left-4 text-white/70 hover:text-white text-4xl font-light p-3 hover:bg-white/10 rounded-xl">
            ‹
          </button>
        )}
        <img src={photo.url} alt={photo.caption || ''} className="max-w-full max-h-full object-contain" />
        {currentIndex < photos.length - 1 && (
          <button onClick={() => onNavigate(1)}
            className="absolute right-4 text-white/70 hover:text-white text-4xl font-light p-3 hover:bg-white/10 rounded-xl">
            ›
          </button>
        )}
      </div>

      {photo.caption && (
        <p className="text-center text-gray-300 text-sm py-3 px-4" onClick={e => e.stopPropagation()}>
          {photo.caption}
        </p>
      )}
    </div>
  );
}
