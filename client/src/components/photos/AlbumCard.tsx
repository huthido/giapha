import { Image } from 'lucide-react';
import type { Album } from '../../types';

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
}

export function AlbumCard({ album, onClick }: AlbumCardProps) {
  const coverUrl = album.cover_url || (album as any).latest_photo;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
    >
      <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            album.type === 'family'
              ? 'bg-amber-400/90 text-white'
              : 'bg-gray-500/80 text-white'
          }`}>
            {album.type === 'family' ? 'Gia đình' : 'Cá nhân'}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{album.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {album.photo_count} ảnh • {album.owner_name}
        </p>
      </div>
    </div>
  );
}
