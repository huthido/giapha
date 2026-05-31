import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

const CHILD_TYPES = ['con trai', 'con gái', 'con', 'con trai nuôi', 'con gái nuôi', 'con nuôi'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChildModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [relationType, setRelationType] = useState('con trai');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) { showToast('Nhập tên cho con', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/family/children', {
        name: name.trim(),
        date_of_birth: dob || undefined,
        relation_type: relationType,
      });
      showToast(`Đã tạo tài khoản cho ${name.trim()}`, 'success');
      setName(''); setDob(''); setRelationType('con trai');
      onCreated();
      onClose();
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  const inputClass = 'w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[48px]';

  return (
    <Modal open={open} onClose={onClose} title="Tạo tài khoản cho con" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-700 dark:text-amber-300">
          Dùng khi con bạn chưa có tài khoản riêng. Sau này con có thể đăng ký để tự quản lý tài khoản của mình.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Ngày sinh <span className="text-gray-400 font-normal">(tùy chọn)</span>
          </label>
          <input
            type="date" value={dob} onChange={e => setDob(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quan hệ</label>
          <select value={relationType} onChange={e => setRelationType(e.target.value)} className={inputClass}>
            {CHILD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button onClick={handleCreate} disabled={loading || !name.trim()}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation">
          {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
        </button>
      </div>
    </Modal>
  );
}
