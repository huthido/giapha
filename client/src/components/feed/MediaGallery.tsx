import { ExternalLink, Play } from 'lucide-react';
import { mediaUrl, isVideoUrl, youtubeId } from '../../lib/utils';

interface MediaGalleryProps {
  media: string[];
  onClick: (url: string) => void;
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = youtubeId(url);
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    );
  }
  // Generic video URL — hiển thị link card
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex flex-col items-center justify-center gap-2 w-full h-full bg-gray-900 text-white hover:bg-gray-800 transition-colors p-4 text-center">
      <Play size={32} className="opacity-70" />
      <span className="text-xs opacity-60 truncate max-w-full">{url}</span>
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <ExternalLink size={12} /> Xem video
      </span>
    </a>
  );
}

export function MediaGallery({ media, onClick }: MediaGalleryProps) {
  if (media.length === 0) return null;

  const images = media.filter(u => !isVideoUrl(u));
  const videos = media.filter(u => isVideoUrl(u));

  const gridClass =
    images.length === 1 ? 'grid-cols-1' :
    images.length === 2 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <div>
      {images.length > 0 && (
        <div className={`grid gap-0.5 ${gridClass}`}>
          {images.map((url, i) => (
            <div key={i}
              className={`overflow-hidden cursor-pointer ${images.length === 1 ? 'max-h-96' : 'aspect-square'}`}
              onClick={() => onClick(url)}>
              <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </div>
          ))}
        </div>
      )}

      {videos.map((url, i) => (
        <div key={i} className="aspect-video overflow-hidden mt-0.5 bg-black">
          <VideoEmbed url={url} />
        </div>
      ))}
    </div>
  );
}
