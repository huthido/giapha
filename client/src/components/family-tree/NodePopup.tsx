import { useEffect, useState } from 'react';
import { X, MessageCircle, Phone, Video, GitBranch } from 'lucide-react';
import type { FamilyNode } from '../../types';
import { Avatar } from '../ui/Avatar';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { EditRelationModal } from './EditRelationModal';

interface InferResult { term: string | null; description: string; }

interface NodePopupProps {
  node: FamilyNode;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onChat: (node: FamilyNode) => void;
  onAudioCall: (userId: string) => void;
  onVideoCall: (userId: string) => void;
  onRelationChanged?: () => void;
}

export function NodePopup({
  node, screenX, screenY, onClose,
  onViewProfile, onChat, onAudioCall, onVideoCall, onRelationChanged,
}: NodePopupProps) {
  const { onlineUsers } = useSocket();
  const { user } = useAuth();
  const isMe = node.user_id === user?.id;
  const [infer, setInfer] = useState<InferResult | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (isMe) return;
    api.get<InferResult>(`/family/infer/${node.user_id}`)
      .then(setInfer)
      .catch(() => {});
  }, [node.user_id, isMe]);

  const popupW = Math.min(240, window.innerWidth - 24);
  const style = {
    width: popupW,
    left: Math.min(Math.max(12, screenX + 16), window.innerWidth - popupW - 12),
    top:  Math.min(Math.max(12, screenY - 80), window.innerHeight - 240),
  };

  return (
    <div
      className="absolute z-20 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4"
      style={style}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar
            src={node.avatar}
            name={node.name}
            size="sm"
            online={onlineUsers.has(node.user_id)}
          />
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{node.name}</p>
            {node.date_of_birth && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(node.date_of_birth).getFullYear()}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={16} />
        </button>
      </div>

      {/* Inferred relationship badge */}
      {!isMe && infer && (
        <div className="mb-3 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
          {infer.term ? (
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {infer.term}
              {infer.description !== infer.term && (
                <span className="font-normal text-amber-500 dark:text-amber-400 ml-1">
                  ({infer.description.replace(infer.term, '').replace(/^\s*\(|\)\s*$/g, '').trim() || infer.description})
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">{infer.description}</p>
          )}
        </div>
      )}

      {node.bio && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{node.bio}</p>
      )}

      <div className="flex flex-col gap-1">
        <button
          onClick={() => onViewProfile(node.user_id)}
          className="text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:bg-amber-50 dark:active:bg-amber-950/40 px-3 py-2.5 rounded-xl text-left transition-colors w-full min-h-[44px] flex items-center"
        >
          Xem trang cá nhân
        </button>
        {!isMe && (
          <>
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:bg-amber-50 px-3 py-2.5 rounded-xl transition-colors w-full min-h-[44px]">
              <GitBranch size={14} /> Sửa quan hệ
            </button>
            <button onClick={() => onChat(node)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 px-3 py-2.5 rounded-xl transition-colors w-full min-h-[44px]">
              <MessageCircle size={14} /> Nhắn tin
            </button>
            <button onClick={() => onAudioCall(node.user_id)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 px-3 py-2.5 rounded-xl transition-colors w-full min-h-[44px]">
              <Phone size={14} /> Gọi điện
            </button>
            <button onClick={() => onVideoCall(node.user_id)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 px-3 py-2.5 rounded-xl transition-colors w-full min-h-[44px]">
              <Video size={14} /> Gọi video
            </button>
          </>
        )}
      </div>

      <EditRelationModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        myUserId={user?.id ?? ''}
        targetUserId={node.user_id}
        targetName={node.name}
        onChanged={() => { onRelationChanged?.(); setInfer(null); }}
      />
    </div>
  );
}
