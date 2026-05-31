import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import type { Conversation, User } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [searchParams] = useSearchParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    api.get<Conversation[]>('/conversations').then(setConversations).catch(() => {});
    api.get<User[]>('/users').then(us => setUsers(us.filter(u => u.id !== user?.id))).catch(() => {});
  }, []);

  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId && conversations.length > 0) {
      const found = conversations.find(c => c.id === convId);
      if (found) setActiveConv(found);
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-message', (msg: any) => {
      setConversations(prev =>
        prev.map(c =>
          c.id === msg.conversation_id
            ? { ...c, last_message: msg.content, last_message_at: msg.created_at, last_sender_id: msg.sender_id,
                unread_count: activeConv?.id === c.id ? 0 : c.unread_count + 1 }
            : c
        ).sort((a, b) =>
          (b.last_message_at || b.created_at) > (a.last_message_at || a.created_at) ? 1 : -1
        )
      );
    });
    return () => { socket.off('new-message'); };
  }, [socket, activeConv]);

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const handleCreate = async () => {
    if (!selectedUsers.length) return;
    try {
      const conv = await api.post<Conversation>('/conversations', {
        type: isGroup ? 'group' : 'direct',
        memberIds: selectedUsers,
        name: isGroup ? groupName || 'Nhóm mới' : undefined,
      });
      if ('existing' in conv && (conv as any).existing) {
        const found = conversations.find(c => c.id === conv.id);
        if (found) { setActiveConv(found); setShowNewChat(false); return; }
      }
      const full = await api.get<Conversation[]>('/conversations');
      setConversations(full);
      const newConv = full.find(c => c.id === conv.id);
      if (newConv) setActiveConv(newConv);
      setShowNewChat(false);
      setSelectedUsers([]); setGroupName('');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500';

  return (
    <AppLayout title="Tin nhắn">
      <div className="flex h-full">
        <div className={`w-full md:w-72 md:flex-shrink-0 ${activeConv ? 'hidden md:block' : 'block'}`}>
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id || null}
            onSelect={handleSelectConv}
            onNew={() => setShowNewChat(true)}
          />
        </div>
        <div className={`flex-1 min-w-0 bg-gray-50 dark:bg-gray-950 ${activeConv ? 'block' : 'hidden md:block'}`}>
          {activeConv ? (
            <ChatWindow key={activeConv.id} conversation={activeConv} onBack={() => setActiveConv(null)} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showNewChat} onClose={() => { setShowNewChat(false); setSelectedUsers([]); }} title="Tin nhắn mới">
        <div className="space-y-4">
          <div className="flex gap-2">
            {([false, true] as const).map(group => (
              <button key={String(group)} onClick={() => setIsGroup(group)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isGroup === group ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                {group ? 'Nhóm chat' : 'Chat riêng'}
              </button>
            ))}
          </div>
          {isGroup && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Tên nhóm..." className={inputClass} />
          )}
          <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-50 dark:divide-gray-800">
            {users.map(u => (
              <div key={u.id} onClick={() => setSelectedUsers(prev =>
                prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
              )}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedUsers.includes(u.id) ? 'bg-amber-50 dark:bg-amber-950/40' : ''}`}>
                <Avatar src={u.avatar} name={u.name} size="sm" />
                <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{u.name}</span>
                {selectedUsers.includes(u.id) && <span className="text-amber-500 dark:text-amber-400 text-xs font-bold">✓</span>}
              </div>
            ))}
          </div>
          {selectedUsers.length > 0 && (
            <button onClick={handleCreate}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-sm transition-colors">
              {isGroup ? `Tạo nhóm (${selectedUsers.length} người)` : 'Bắt đầu chat'}
            </button>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
