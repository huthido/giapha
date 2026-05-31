import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { useToast } from '../components/ui/Toast';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { OAuthButtons } from '../components/auth/OAuthButtons';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }
    setLoading(true);
    try {
      const { token, user } = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password });
      login(token, user);
      navigate('/');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally { setLoading(false); }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-sm';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-md p-8 border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tham gia gia đình</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tạo tài khoản để kết nối với người thân</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Họ và tên</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Nguyễn Văn A" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="ten@email.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Tối thiểu 6 ký tự" className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm">
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <OAuthButtons label="Đăng ký" />

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-amber-500 hover:text-amber-600 font-medium">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
