import { useState, useEffect, useRef } from 'react';
import type { Message, Conversation } from '../../types';
import { Lightbox } from '../ui/Lightbox';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';
import { useToast } from '../ui/Toast';

interface ChatWindowProps { conversation: Conversation; onBack?: () => void; }

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { socket } = useSocket();
  const { callUser } = useCall();
  const { showToast } = useToast();

  const other = conversation.type === 'direct'
    ? conversation.members.find(m => m.id !== user?.id)
    : null;

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    api.get<Message[]>(`/conversations/${conversation.id}/messages`)
      .then(setMessages)
      .finally(() => setLoading(false));
    socket?.emit('join-conversation', conversation.id);
    return () => { socket?.emit('leave-conversation', conversation.id); };
  }, [conversation.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg: Message) => {
      if (msg.conversation_id === conversation.id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark-read', conversation.id);
      }
    };
    const onTyping = ({ convId, userId }: any) => {
      if (convId === conversation.id && userId !== user?.id) {
        setTypingUsers(prev => prev.includes(userId) ? prev : [...prev, userId]);
      }
    };
    const onStop = ({ convId, userId }: any) => {
      if (convId === conversation.id) setTypingUsers(prev => prev.filter(id => id !== userId));
    };
    socket.on('new-message', onMsg);
    socket.on('user-typing', onTyping);
    socket.on('user-stop-typing', onStop);
    return () => {
      socket.off('new-message', onMsg);
      socket.off('user-typing', onTyping);
      socket.off('user-stop-typing', onStop);
    };
  }, [socket, conversation.id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (v: string) => {
    setInput(v);
    socket?.emit('typing', { convId: conversation.id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket?.emit('stop-typing', { convId: conversation.id }), 1500
    );
  };

  const sendText = () => {
    if (!input.trim()) return;
    socket?.emit('send-message', { convId: conversation.id, content: input.trim(), type: 'text' });
    setInput('');
    socket?.emit('stop-typing', { convId: conversation.id });
  };

  const sendFiles = async (files: File[]) => {
    const fd = new FormData();
    files.forEach(f => fd.append('media', f));
    fd.append('type', 'image');
    try {
      const msg = await api.upload<Message>(`/conversations/${conversation.id}/messages`, fd);
      setMessages(prev => [...prev, msg]);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const displayName = other?.name || conversation.name || 'Nhóm';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        onAudioCall={() => other && callUser(other.id, conversation.id, 'audio')}
        onVideoCall={() => other && callUser(other.id, conversation.id, 'video')}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            Bắt đầu cuộc trò chuyện với {displayName}
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.sender_id === user?.id}
              onImageClick={setLightbox}
            />
          ))
        )}
        {typingUsers.length > 0 && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        value={input}
        onChange={handleInput}
        onSend={sendText}
        onFiles={sendFiles}
      />

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
