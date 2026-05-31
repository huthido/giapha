import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';

interface CallControlsProps {
  muted: boolean;
  cameraOff: boolean;
  callType: 'audio' | 'video';
  onMute: () => void;
  onCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({ muted, cameraOff, callType, onMute, onCamera, onEndCall }: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-6 bg-black/30">
      <button
        onClick={onMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          muted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
        }`}
        title={muted ? 'Bật mic' : 'Tắt mic'}
      >
        {muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
      </button>

      {callType === 'video' && (
        <button
          onClick={onCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            cameraOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
          }`}
          title={cameraOff ? 'Bật camera' : 'Tắt camera'}
        >
          {cameraOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
        </button>
      )}

      <button
        onClick={onEndCall}
        className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
        title="Kết thúc cuộc gọi"
      >
        <Phone size={22} className="text-white rotate-[135deg]" />
      </button>
    </div>
  );
}
