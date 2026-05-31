import { useState, useEffect } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { RELATION_GROUPS } from '../../lib/utils';
import { useToast } from '../ui/Toast';

interface Relation {
  id: string;
  user_id: string;
  related_user_id: string;
  relation_type: string;
}

interface EditRelationModalProps {
  open: boolean;
  onClose: () => void;
  myUserId: string;
  targetUserId: string;
  targetName: string;
  onChanged: () => void;
}

export function EditRelationModal({
  open, onClose, myUserId, targetUserId, targetName, onChanged,
}: EditRelationModalProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setEditingId(null);
      api.get<Relation[]>(`/family/relationships/between/${targetUserId}`)
        .then(setRelations)
        .catch(() => setRelations([]));
    }
  }, [open, targetUserId]);

  const startEdit = (r: Relation) => {
    setEditingId(r.id);
    setEditType(r.relation_type);
  };

  const saveEdit = async (id: string) => {
    if (!editType) return;
    setLoading(true);
    try {
      await api.put(`/family/relationships/${id}`, { relation_type: editType });
      setRelations(prev => prev.map(r => r.id === id ? { ...r, relation_type: editType } : r));
      setEditingId(null);
      onChanged();
      showToast('Đã cập nhật quan hệ', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const deleteRel = async (id: string) => {
    if (!confirm('Xóa quan hệ này?')) return;
    setLoading(true);
    try {
      await api.delete(`/family/relationships/id/${id}`);
      setRelations(prev => prev.filter(r => r.id !== id));
      onChanged();
      showToast('Đã xóa quan hệ', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const selectClass = 'flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <Modal open={open} onClose={onClose} title={`Quan hệ với ${targetName}`}>
      <div className="space-y-3">
        {relations.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            Chưa có quan hệ nào được khai báo
          </p>
        ) : (
          relations.map(r => (
            <div key={r.id}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              {editingId === r.id ? (
                <>
                  <select value={editType} onChange={e => setEditType(e.target.value)}
                    className={selectClass}>
                    {RELATION_GROUPS.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button onClick={() => saveEdit(r.id)} disabled={loading}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {targetName} là
                    </p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {r.relation_type}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">của bạn</p>
                  </div>
                  <button onClick={() => startEdit(r)}
                    className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteRel(r.id)} disabled={loading}
                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
          Để thêm quan hệ mới, dùng nút "Thêm quan hệ" trên cây gia phả
        </p>
      </div>
    </Modal>
  );
}
