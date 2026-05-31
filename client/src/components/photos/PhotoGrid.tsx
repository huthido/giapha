import { Trash2 } from 'lucide-react';
import type { Photo } from '../../types';
import { mediaUrl } from '../../lib/utils';

interface PhotoGridProps {
  photos: Photo[];
  currentUserId?: string;
  onPhotoClick: (photo: Photo, index: number) => void;
  onPhotoDelete: (photo: Photo) => void;
}

export function PhotoGrid({ photos, currentUserId, onPhotoClick, onPhotoDelete }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((photo, idx) => (
        <div
          key={photo.id}
          className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative bg-gray-100 dark:bg-gray-800"
          onClick={() => onPhotoClick(photo, idx)}
        >
          <img
            src={mediaUrl(photo.url)}
            alt={photo.caption || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          {photo.uploader_id === currentUserId && (
            <button
              onClick={e => { e.stopPropagation(); onPhotoDelete(photo); }}
              className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
