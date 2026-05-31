import { useRef, useEffect } from 'react';

interface RemoteVideoProps {
  stream: MediaStream;
  userId: string;
}

export function RemoteVideo({ stream }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative bg-gray-800">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
    </div>
  );
}
