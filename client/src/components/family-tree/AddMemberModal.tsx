import { useState, useEffect } from 'react';
import { Send, Plus, Search } from 'lucide-react';
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

interface PersonOption {
  id: string;
  name: string;
  avatar: string | null;
  sub?: string;
}

function PersonPickerField({
  label, value, onChange, options, placeholder = 'Tìm theo tên...',
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: PersonOption[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(
    o => !search || o.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = options.find(o => o.id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
          <Avatar src={selected.avatar} name={selected.name} size="xs" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 flex-1 truncate">{selected.name}</span>
          <button onClick={() => onChange('')} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-xs px-1">✕</button>
        </div>
      )}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
          />
        </div>
        <div className="max-h-36 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
          {filtered.map(o => (
            <div key={o.id} onClick={() => { onChange(o.id); setSearch(''); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors min-h-[44px] ${
                value === o.id
                  ? 'bg-amber-50 dark:bg-amber-950/40'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <Avatar src={o.avatar} name={o.name} size="xs" />
              <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{o.name}</span>
              {o.sub && <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{o.sub}</span>}
              {value === o.id && <span className="text-amber-500 text-xs font-bold shrink-0">✓</span>}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">Không tìm thấy</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AddMemberModal({ open, onClose, onAdded, existingNodes }: AddMemberModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [relatedNode, setRelatedNode] = useState('');
  const [relationType, setRelationType] = useState('con trai');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedUser(''); setRelatedNode(''); setRelationType('con trai'); setMessage('');
      api.get<User[]>('/users').then(setUsers).catch(() => {});
    }
  }, [open]);

  const userOptions: PersonOption[] = users.map(u => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    sub: u.id === me?.id ? '(bạn)' : undefined,
  }));

  const nodeOptions: PersonOption[] = existingNodes.map(n => ({
    id: n.id,
    name: n.name,
    avatar: n.avatar,
    sub: n.date_of_birth ? String(new Date(n.date_of_birth).getFullYear()) : undefined,
  }));

  const relatedNodeData = existingNodes.find(n => n.id === relatedNode);
  const willRequest = !isAdmin && selectedUser !== me?.id;

  const handleSubmit = async () => {
    if (!selectedUser || !relatedNode) { showToast('Chọn đủ thông tin', 'error'); return; }
    if (selectedUser === relatedNodeData?.user_id) { showToast('Không thể tạo quan hệ với chính mình', 'error'); return; }
    setLoading(true);
    try {
      if (willRequest) {
        await api.post('/family/requests', {
          to_user_id: relatedNodeData?.user_id,
          relation_type: relationType,
          message: message.trim() || undefined,
        });
        showToast('Đã gửi yêu cầu quan hệ — chờ xác nhận', 'success');
      } else {
        await api.post('/family/relationships', {
          user_id: selectedUser,
          related_user_id: relatedNodeData?.user_id,
          relation_type: relationType,
        });
        showToast('Đã thêm quan hệ thành công', 'success');
        onAdded();
      }
      onClose();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Lỗi', 'error'); }
    setLoading(false);
  };

  const selectClass = 'w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 min-h-[48px]';

  return (
    <Modal open={open} onClose={onClose} title="Thêm quan hệ gia đình">
      <div className="space-y-4">
        <PersonPickerField
          label="Thành viên"
          value={selectedUser}
          onChange={setSelectedUser}
          options={userOptions}
          placeholder="Tìm thành viên..."
        />

        <PersonPickerField
          label="Có quan hệ với ai?"
          value={relatedNode}
          onChange={setRelatedNode}
          options={nodeOptions}
          placeholder="Tìm người trong cây..."
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {relatedNodeData ? `${relatedNodeData.name} là ...` : 'Vai trò'}
          </label>
          <select value={relationType} onChange={e => setRelationType(e.target.value)} className={selectClass}>
            {RELATION_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(r => <option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {willRequest && selectedUser && relatedNode && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tin nhắn kèm theo <span className="text-gray-400 font-normal">(tùy chọn)</span>
              </label>
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Ví dụ: Chào, tôi là con trai của bạn..."
                className={selectClass} />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              <Send size={14} className="mt-0.5 shrink-0" />
              <span>
                Sẽ gửi yêu cầu đến <strong>{relatedNodeData?.name}</strong> để xác nhận quan hệ.
              </span>
            </div>
          </>
        )}

        <button onClick={handleSubmit} disabled={loading || !selectedUser || !relatedNode}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation flex items-center justify-center gap-2">
          {loading ? 'Đang xử lý...' : willRequest
            ? <><Send size={16} /> Gửi yêu cầu</>
            : <><Plus size={16} /> Thêm quan hệ</>
          }
        </button>
      </div>
    </Modal>
  );
}
