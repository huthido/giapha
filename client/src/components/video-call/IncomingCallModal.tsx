import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import { Avatar } from '../ui/Avatar';

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center gap-5 w-72">
        <div className="relative">
          <Avatar src={incomingCall.caller.avatar} name={incomingCall.caller.name} size="xl" />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5">
            {incomingCall.type === 'video'
              ? <Video size={14} className="text-white" />
              : <Phone size={14} className="text-white" />
            }
          </div>
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{incomingCall.caller.name}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {incomingCall.type === 'video' ? 'Đang gọi video cho bạn...' : 'Đang gọi điện cho bạn...'}
          </p>
        </div>
        <div className="flex gap-6">
          <button onClick={declineCall} className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg">
              <PhoneOff size={24} className="text-white" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Từ chối</span>
          </button>
          <button onClick={acceptCall} className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg animate-pulse">
              <Phone size={24} className="text-white" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Nhận</span>
          </button>
        </div>
      </div>
    </div>
  );
}
