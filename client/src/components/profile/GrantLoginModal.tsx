import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onGranted: () => void;
}

/** Cấp email + mật khẩu cho tài khoản người thân được quản lý, để họ tự đăng nhập. */
export function GrantLoginModal({ open, onClose, userId, userName, onGranted }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleGrant = async () => {
    if (!email.trim()) { showToast('Nhập email đăng nhập', 'error'); return; }
    if (password.length < 8) { showToast('Mật khẩu phải có ít nhất 8 ký tự', 'error'); return; }
    setLoading(true);
    try {
      await api.put(`/family/relatives/${userId}/credentials`, { email: email.trim(), password });
      showToast(`Đã cấp đăng nhập cho ${userName}. Hãy gửi email và mật khẩu cho họ.`, 'success');
      setEmail(''); setPassword('');
      onGranted();
      onClose();
    } catch (e) { showToast((e as Error).message, 'error'); }
    setLoading(false);
  };

  const inputClass = 'w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[48px]';

  return (
    <Modal open={open} onClose={onClose} title={`Cấp đăng nhập cho ${userName}`} size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-700 dark:text-amber-300">
          Sau khi cấp, {userName} có thể tự đăng nhập bằng email và mật khẩu này.
          Bạn vẫn giữ quyền chỉnh sửa hồ sơ giúp họ.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email đăng nhập</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="nguoithan@gmail.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu (≥ 8 ký tự)</label>
          <input
            type="text" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mật khẩu để gửi cho người thân"
            className={inputClass}
          />
        </div>

        <button onClick={handleGrant} disabled={loading || !email.trim() || password.length < 8}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation">
          {loading ? 'Đang cấp...' : 'Cấp đăng nhập'}
        </button>
      </div>
    </Modal>
  );
}
