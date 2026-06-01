import { useState, useEffect } from 'react';
import { Plus, Trash2, GitFork } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import type { Branch, FamilyNode } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

interface BranchManagerProps {
  open: boolean;
  onClose: () => void;
  nodes: FamilyNode[];
  branches: Branch[];
  onChanged: (branches: Branch[]) => void;
}

export function BranchManager({ open, onClose, nodes, branches, onChanged }: BranchManagerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', root_user_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setCreating(false); setForm({ name: '', description: '', root_user_id: '' }); }
  }, [open]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const b = await api.post<Branch>('/branches', form);
      onChanged([...branches, b]);
      setCreating(false);
      setForm({ name: '', description: '', root_user_id: '' });
      showToast('Đã tạo nhánh', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá nhánh này?')) return;
    try {
      await api.delete(`/branches/${id}`);
      onChanged(branches.filter(b => b.id !== id));
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <Modal open={open} onClose={onClose} title="Quản lý nhánh gia phả">
      <div className="space-y-4">

        {/* Danh sách nhánh */}
        {branches.length === 0 && !creating ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            <GitFork size={32} className="mx-auto mb-2 opacity-30" />
            Chưa có nhánh nào. Tạo nhánh để xem một phần cây theo dòng họ.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {branches.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <Avatar src={b.root_avatar} name={b.root_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Gốc: {b.root_name}</p>
                </div>
                {(b.created_by === user?.id || user?.role === 'admin') && (
                  <button onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form tạo nhánh */}
        {creating ? (
          <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nhánh mới</p>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Tên nhánh — VD: Nhánh Ông Nguyễn Văn An" className={inputClass} />
            <select value={form.root_user_id} onChange={e => setForm(f => ({ ...f, root_user_id: e.target.value }))}
              className={inputClass}>
              <option value="">-- Chọn người làm gốc nhánh --</option>
              {nodes.map(n => <option key={n.id} value={n.user_id}>{n.name}</option>)}
            </select>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả (tuỳ chọn)" className={inputClass} />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                Huỷ
              </button>
              <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.root_user_id}
                className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
                {saving ? 'Đang lưu...' : 'Tạo nhánh'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-500 dark:hover:border-amber-600 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Tạo nhánh mới
          </button>
        )}
      </div>
    </Modal>
  );
}
