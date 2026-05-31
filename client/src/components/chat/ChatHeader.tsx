import { Phone, Video, ChevronLeft } from 'lucide-react';
import type { Conversation } from '../../types';
import { Avatar } from '../ui/Avatar';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface ChatHeaderProps {
  conversation: Conversation;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onBack?: () => void;
}

export function ChatHeader({ conversation, onAudioCall, onVideoCall, onBack }: ChatHeaderProps) {
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  const other = conversation.type === 'direct'
    ? conversation.members.find(m => m.id !== user?.id)
    : null;

  const displayName = other?.name || conversation.name || 'Nhóm';
  const displayAvatar = other?.avatar || conversation.avatar;
  const isOnline = other ? onlineUsers.has(other.id) : false;

  return (
    <div className="flex items-center justify-between px-4 py-3.5 min-h-[60px] bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onBack && (
          <button onClick={onBack}
            className="md:hidden -ml-1 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Quay lại">
            <ChevronLeft size={22} />
          </button>
        )}
        <Avatar src={displayAvatar} name={displayName} online={isOnline} />
        <div>
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{displayName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </p>
        </div>
      </div>
      {other && (
        <div className="flex gap-1">
          <button onClick={onAudioCall}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 rounded-xl text-gray-500 dark:text-gray-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Phone size={20} />
          </button>
          <button onClick={onVideoCall}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 rounded-xl text-gray-500 dark:text-gray-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Video size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
