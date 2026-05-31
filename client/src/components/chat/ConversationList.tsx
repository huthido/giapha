import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Conversation } from '../../types';
import { Avatar } from '../ui/Avatar';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNew: () => void;
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  const filtered = conversations.filter(c => {
    const name = c.type === 'direct'
      ? c.members.find(m => m.id !== user?.id)?.name || c.name || ''
      : c.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Tin nhắn</h2>
          <button onClick={onNew}
            className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:bg-amber-50 dark:active:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Plus size={20} />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..."
            className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Chưa có cuộc trò chuyện</div>
        ) : (
          filtered.map(conv => {
            const other = conv.type === 'direct' ? conv.members.find(m => m.id !== user?.id) : null;
            const displayName = other?.name || conv.name || 'Nhóm';
            const displayAvatar = other?.avatar || conv.avatar;
            const isOnline = other ? onlineUsers.has(other.id) : false;

            return (
              <div key={conv.id} onClick={() => onSelect(conv)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 min-h-[64px] touch-manipulation ${activeId === conv.id ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}>
                <Avatar src={displayAvatar} name={displayName} size="md" online={isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{displayName}</p>
                    {conv.last_message_at && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {conv.last_message ? (conv.last_sender_id === user?.id ? 'Bạn: ' : '') + conv.last_message : 'Bắt đầu trò chuyện'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
