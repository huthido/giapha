import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { RELATION_GROUPS } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import type { LaidOutNode } from '../../lib/familyLayout';

interface DragRelationModalProps {
  open: boolean;
  onClose: () => void;
  fromNode: LaidOutNode | null;
  toNode: LaidOutNode | null;
  onAdded: () => void;
}

export function DragRelationModal({ open, onClose, fromNode, toNode, onAdded }: DragRelationModalProps) {
  const [relationType, setRelationType] = useState('cha/mẹ');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!fromNode || !toNode) return null;

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post('/family/relationships', {
        user_id: fromNode.user_id,
        related_user_id: toNode.user_id,
        relation_type: relationType,
      });
      showToast('Đã thêm quan hệ', 'success');
      onAdded();
      onClose();
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Thiết lập quan hệ" size="sm">
      <div className="space-y-4">
        {/* Hai người */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex flex-col items-center gap-1 flex-1">
            <Avatar src={fromNode.avatar} name={fromNode.name} size="md" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center">{fromNode.name}</span>
          </div>

          <div className="flex flex-col items-center gap-1 px-2">
            <div className="w-8 h-0.5 bg-amber-400 rounded" />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{relationType}</span>
            <div className="w-8 h-0.5 bg-amber-400 rounded" />
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            <Avatar src={toNode.avatar} name={toNode.name} size="md" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center">{toNode.name}</span>
          </div>
        </div>

        {/* Chọn quan hệ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {toNode.name} là <span className="text-amber-600 dark:text-amber-400">{relationType}</span> của {fromNode.name}
          </label>
          <select
            value={relationType}
            onChange={e => setRelationType(e.target.value)}
            className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[48px]"
          >
            {RELATION_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(t => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          onClick={handleAdd}
          disabled={loading}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation"
        >
          {loading ? 'Đang thêm...' : 'Xác nhận'}
        </button>
      </div>
    </Modal>
  );
}
