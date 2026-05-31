import { useRef, useEffect } from 'react';
import { VideoOff } from 'lucide-react';

interface LocalVideoPreviewProps {
  stream: MediaStream | null;
  cameraOff: boolean;
  callType: 'audio' | 'video';
}

export function LocalVideoPreview({ stream, cameraOff, callType }: LocalVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  if (!stream || callType !== 'video') return null;

  return (
    <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-gray-800">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      {cameraOff && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <VideoOff size={20} className="text-gray-400" />
        </div>
      )}
    </div>
  );
}
