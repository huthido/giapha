import { useState } from 'react';
import { Copy, Check, Link2, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { RELATION_GROUPS } from '../../lib/utils';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeGender, setInviteeGender] = useState('');
  const [inviteeDob, setInviteeDob] = useState('');
  const [relationType, setRelationType] = useState('');
  const [message, setMessage] = useState('');
  const [expiresDays, setExpiresDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 placeholder-gray-400 dark:placeholder-gray-500';
  const selectClass = `${inputClass} appearance-none`;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { token } = await api.post<{ token: string }>('/invites', {
        invitee_name: inviteeName || undefined,
        invitee_gender: inviteeGender || undefined,
        invitee_dob: inviteeDob || undefined,
        relation_type: relationType || undefined,
        message: message || undefined,
        expires_days: expiresDays,
      });
      setLink(`${window.location.origin}/join?token=${token}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tạo lời mời', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setInviteeName('');
    setInviteeGender('');
    setInviteeDob('');
    setRelationType('');
    setMessage('');
    setExpiresDays(7);
    setLink('');
    setCopied(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Tạo lời mời tham gia">
      {!link ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tạo đường link để gửi cho người thân. Họ sẽ đăng ký và tự động được thêm vào cây gia phả.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Tên người được mời <span className="font-normal text-gray-400">(gợi ý khi họ đăng ký)</span>
            </label>
            <input type="text" value={inviteeName} onChange={e => setInviteeName(e.target.value)}
              placeholder="VD: Nguyễn Văn B" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Giới tính</label>
              <select value={inviteeGender} onChange={e => setInviteeGender(e.target.value)} className={selectClass}>
                <option value="">Không xác định</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Ngày sinh</label>
              <input type="date" value={inviteeDob} onChange={e => setInviteeDob(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Mối quan hệ với bạn <span className="font-normal text-gray-400">(để trống nếu chưa biết)</span>
            </label>
            <select value={relationType} onChange={e => setRelationType(e.target.value)} className={selectClass}>
              <option value="">— Chưa xác định —</option>
              {RELATION_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Lời nhắn</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={2} placeholder="VD: Mình là con trai của bố, hãy tham gia để kết nối gia đình nhé!"
              className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Thời hạn link</label>
            <select value={expiresDays} onChange={e => setExpiresDays(Number(e.target.value))} className={selectClass}>
              <option value={1}>1 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Hủy
            </button>
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
              <UserPlus size={15} />
              {loading ? 'Đang tạo...' : 'Tạo link mời'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
            <Link2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Link mời đã được tạo!</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Đường link mời</label>
            <div className="flex gap-2">
              <input readOnly value={link}
                className={`${inputClass} text-xs flex-1 truncate`}
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Gửi link này cho người thân. Họ nhấn vào sẽ được hướng dẫn đăng ký và kết nối với bạn trong cây gia phả.
          </p>

          <div className="flex gap-3">
            <button onClick={() => setLink('')}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Tạo link khác
            </button>
            <button onClick={handleClose}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
              Xong
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
