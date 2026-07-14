import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

const RELATION_GROUPS: [string, string[]][] = [
  ['Con cái', ['con trai', 'con gái', 'con', 'con trai nuôi', 'con gái nuôi', 'con nuôi']],
  ['Cha mẹ', ['cha', 'mẹ', 'cha nuôi', 'mẹ nuôi']],
  ['Ông bà', ['ông', 'bà']],
  ['Vợ chồng', ['vợ', 'chồng']],
  ['Anh chị em', ['anh', 'chị', 'em trai', 'em gái']],
  ['Cô dì chú bác', ['bác', 'chú', 'thím', 'cô', 'dì', 'cậu', 'dượng', 'mợ']],
  ['Cháu', ['cháu trai', 'cháu gái']],
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRelativeModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [relationType, setRelationType] = useState('con trai');
  const [withLogin, setWithLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const reset = () => {
    setName(''); setDob(''); setGender(''); setRelationType('con trai');
    setWithLogin(false); setEmail(''); setPassword('');
  };

  const handleCreate = async () => {
    if (!name.trim()) { showToast('Nhập tên người thân', 'error'); return; }
    if (withLogin) {
      if (!email.trim()) { showToast('Nhập email đăng nhập', 'error'); return; }
      if (password.length < 8) { showToast('Mật khẩu phải có ít nhất 8 ký tự', 'error'); return; }
    }
    setLoading(true);
    try {
      await api.post('/family/relatives', {
        name: name.trim(),
        relation_type: relationType,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        email: withLogin ? email.trim() : undefined,
        password: withLogin ? password : undefined,
      });
      showToast(
        withLogin
          ? `Đã tạo tài khoản cho ${name.trim()}. Hãy gửi email và mật khẩu cho họ để đăng nhập.`
          : `Đã tạo tài khoản cho ${name.trim()}`,
        'success'
      );
      reset();
      onCreated();
      onClose();
    } catch (e) { showToast((e as Error).message, 'error'); }
    setLoading(false);
  };

  const inputClass = 'w-full px-3 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[48px]';

  return (
    <Modal open={open} onClose={onClose} title="Tạo tài khoản cho người thân" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs text-amber-700 dark:text-amber-300">
          Dùng khi người thân chưa có tài khoản (ông bà, cha mẹ, con cái...). Bạn sẽ quản lý hồ sơ này,
          và có thể cấp thông tin đăng nhập ngay hoặc sau này.
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quan hệ với bạn</label>
          <select value={relationType} onChange={e => setRelationType(e.target.value)} className={inputClass}>
            {RELATION_GROUPS.map(([group, types]) => (
              <optgroup key={group} label={group}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Giới tính <span className="text-gray-400 font-normal">(tùy chọn)</span>
            </label>
            <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="nam">Nam</option>
              <option value="nữ">Nữ</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl cursor-pointer">
          <input
            type="checkbox" checked={withLogin} onChange={e => setWithLogin(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <KeyRound size={14} className="text-amber-500" />
            Tạo thông tin đăng nhập cho người này
          </span>
        </label>

        {withLogin && (
          <div className="space-y-3 pl-1">
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
          </div>
        )}

        <button onClick={handleCreate} disabled={loading || !name.trim()}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[52px] touch-manipulation">
          {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
        </button>
      </div>
    </Modal>
  );
}
