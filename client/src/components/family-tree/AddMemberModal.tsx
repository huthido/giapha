import { useState, useEffect } from 'react';
import { Send, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import type { User, FamilyNode } from '../../types';
import { RELATION_GROUPS } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingNodes: FamilyNode[];
}

export function AddMemberModal({ open, onClose, onAdded, existingNodes }: AddMemberModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [relatedNode, setRelatedNode] = useState<string>('');
  const [relationType, setRelationType] = useState('con trai');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    if (open) {
      setSelectedUser('');
      setRelatedNode('');
      setRelationType('con trai');
      setMessage('');
      api.get<User[]>('/users').then(setUsers);
    }
  }, [open]);

  const relatedNodeData = existingNodes.find(n => n.id === relatedNode);
  const selectedTarget = relatedNodeData?.user_id;

  // Non-admin gửi REQUEST thay vì tạo trực tiếp (trừ khi selectedUser là chính họ)
  const willRequest = !isAdmin && selectedUser !== me?.id;

  const handleSubmit = async () => {
    if (!selectedUser || !relatedNode) { showToast('Chọn đủ thông tin', 'error'); return; }
    if (selectedUser === selectedTarget) { showToast('Không thể tạo quan hệ với chính mình', 'error'); return; }
    setLoading(true);
    try {
      if (willRequest) {
        // Gửi yêu cầu đến người được chọn
        await api.post('/family/requests', {
          to_user_id: selectedTarget,
          relation_type: relationType,
          message: message.trim() || undefined,
        });
        showToast('Đã gửi yêu cầu quan hệ — chờ xác nhận', 'success');
      } else {
        await api.post('/family/relationships', {
          user_id: selectedUser,
          related_user_id: selectedTarget,
          relation_type: relationType,
        });
        showToast('Đã thêm quan hệ thành công', 'success');
        onAdded();
      }
      onClose();
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const selectClass = 'w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 min-h-[48px]';

  return (
    <Modal open={open} onClose={onClose} title="Thêm quan hệ gia đình">
      <div className="space-y-4">

        {/* Chọn thành viên A */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thành viên</label>
          <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {users.map(u => (
              <div key={u.id} onClick={() => setSelectedUser(u.id)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-colors min-h-[52px] touch-manipulation ${selectedUser === u.id ? 'bg-amber-50 dark:bg-amber-950/40' : ''}`}>
                <Avatar src={u.avatar} name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{u.name}</span>
                  {u.id === me?.id && <span className="ml-2 text-xs text-amber-500">(bạn)</span>}
                </div>
                {selectedUser === u.id && <span className="text-amber-500 text-xs font-bold">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Có quan hệ với ai */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Có quan hệ với ai?</label>
          <select value={relatedNode} onChange={e => setRelatedNode(e.target.value)} className={selectClass}>
            <option value="">-- Chọn người --</option>
            {existingNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>

        {/* Vai trò */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {relatedNodeData ? `${relatedNodeData.name} là` : 'Vai trò'} ...
          </label>
          <select value={relationType} onChange={e => setRelationType(e.target.value)} className={selectClass}>
            {RELATION_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(r => <option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Nếu là request → thêm tin nhắn tùy chọn */}
        {willRequest && selectedUser && relatedNode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tin nhắn kèm theo <span className="text-gray-400 font-normal">(tùy chọn)</span>
            </label>
            <input
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Ví dụ: Chào, tôi là con trai của bạn..."
              className={selectClass}
            />
          </div>
        )}

        {/* Mô tả hành động */}
        {willRequest && selectedUser && relatedNode && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-xs text-blue-700 dark:text-blue-300">
            <Send size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Sẽ gửi yêu cầu đến <strong>{relatedNodeData?.name}</strong> để xác nhận quan hệ.
              Họ cần chấp nhận trước khi quan hệ được thêm vào cây.
            </span>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading || !selectedUser || !relatedNode}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation flex items-center justify-center gap-2">
          {loading ? 'Đang xử lý...' : willRequest ? (
            <><Send size={16} /> Gửi yêu cầu</>
          ) : (
            <><Plus size={16} /> Thêm quan hệ</>
          )}
        </button>
      </div>
    </Modal>
  );
}
