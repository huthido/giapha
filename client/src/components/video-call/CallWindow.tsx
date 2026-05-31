import { useState, useEffect } from 'react';
import { Phone, Minimize2, Maximize2 } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import { RemoteVideo } from './RemoteVideo';
import { CallControls } from './CallControls';
import { LocalVideoPreview } from './LocalVideoPreview';
import { formatDuration } from '../../lib/utils';

export function CallWindow() {
  const { activeCall, localStream, remoteStreams, endCall, toggleMute, toggleCamera } = useCall();
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMute = () => { const m = toggleMute(); setMuted(m); };
  const handleCamera = () => { const off = toggleCamera(); setCameraOff(off); };

  if (minimized) {
    return (
      <div className="fixed bottom-4 left-4 z-[150] bg-gray-900 text-white rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          <Phone size={14} />
        </div>
        <span className="text-sm tabular-nums">{formatDuration(elapsed)}</span>
        <button onClick={() => setMinimized(false)} className="p-1 hover:bg-white/20 rounded-lg">
          <Maximize2 size={14} />
        </button>
        <button onClick={endCall} className="p-1 bg-red-500 hover:bg-red-600 rounded-lg">
          <Phone size={14} className="rotate-[135deg]" />
        </button>
      </div>
    );
  }

  const gridClass =
    remoteStreams.length <= 1 ? 'grid-cols-1' :
    remoteStreams.length <= 4 ? 'grid-cols-2' :
    'grid-cols-3';

  return (
    <div className="fixed inset-0 z-[150] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30">
        <span className="text-white text-sm font-medium">
          {activeCall?.type === 'video' ? 'Gọi video' : 'Gọi thoại'} • {formatDuration(elapsed)}
        </span>
        <button onClick={() => setMinimized(true)} className="p-2 text-white/70 hover:text-white">
          <Minimize2 size={18} />
        </button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {remoteStreams.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Phone size={32} />
              </div>
              <p className="text-lg font-medium">Đang chờ kết nối...</p>
            </div>
          </div>
        ) : (
          <div className={`grid h-full gap-1 ${gridClass}`}>
            {remoteStreams.map(({ userId, stream }) => (
              <RemoteVideo key={userId} stream={stream} userId={userId} />
            ))}
          </div>
        )}
        <LocalVideoPreview stream={localStream} cameraOff={cameraOff} callType={activeCall?.type || 'video'} />
      </div>

      <CallControls
        muted={muted}
        cameraOff={cameraOff}
        callType={activeCall?.type || 'video'}
        onMute={handleMute}
        onCamera={handleCamera}
        onEndCall={endCall}
      />
    </div>
  );
}
