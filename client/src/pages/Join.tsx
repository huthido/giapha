import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GitBranch, Eye, EyeOff, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { useToast } from '../components/ui/Toast';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Avatar } from '../components/ui/Avatar';
import { formatDate } from '../lib/utils';

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:5109';

interface InvitePreview {
  id: string;
  token: string;
  inviter_name: string;
  inviter_avatar: string | null;
  inviter_id: string;
  relation_type: string | null;
  invitee_name: string | null;
  invitee_dob: string | null;
  invitee_gender: string | null;
  message: string | null;
  expires_at: string;
}

type Mode = 'register' | 'login';

export function Join() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { showToast } = useToast();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);

  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) { setPreviewError('Link mời không hợp lệ'); setPreviewLoading(false); return; }
    api.get<InvitePreview>(`/invites/preview/${token}`)
      .then(data => { setPreview(data); setName(data.invitee_name ?? ''); })
      .catch((err: unknown) => setPreviewError(err instanceof Error ? err.message : 'Lỗi tải lời mời'))
      .finally(() => setPreviewLoading(false));
  }, [token]);

  // Lưu invite token trước khi redirect OAuth
  const oauthLink = (provider: 'google' | 'facebook') => {
    localStorage.setItem('pending_invite', token);
    return `${SERVER}/api/auth/${provider}`;
  };

  const acceptInvite = async (authToken: string, userObj: User) => {
    login(authToken, userObj);
    try {
      await api.post(`/invites/accept/${token}`);
      showToast(`Đã kết nối với ${preview?.inviter_name}!`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Đã xảy ra lỗi', 'error');
    }
    navigate('/', { replace: true });
  };

  const handleAcceptAsLoggedIn = async () => {
    if (!user) return;
    setAccepting(true);
    try {
      await api.post(`/invites/accept/${token}`);
      showToast(`Đã kết nối với ${preview?.inviter_name}!`, 'success');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Đã xảy ra lỗi', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }
    setSubmitting(true);
    try {
      const { token: authToken, user: userObj } = await api.post<{ token: string; user: User }>('/auth/register', {
        name, email, password,
      });
      await acceptInvite(authToken, userObj);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Đã xảy ra lỗi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { token: authToken, user: userObj } = await api.post<{ token: string; user: User }>('/auth/login', {
        email, password,
      });
      await acceptInvite(authToken, userObj);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Đã xảy ra lỗi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-sm';

  if (previewLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-gray-800">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Lời mời không hợp lệ</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{previewError}</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Invite info header */}
        <div className="bg-amber-50 dark:bg-amber-950/30 px-8 py-6 border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-4">
            <Avatar src={preview!.inviter_avatar} name={preview!.inviter_name} size="lg" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Lời mời từ</p>
              <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{preview!.inviter_name}</p>
              {preview!.relation_type && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Bạn là <strong>{preview!.relation_type}</strong> của họ
                </p>
              )}
            </div>
          </div>
          {preview!.message && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 italic bg-white/60 dark:bg-gray-800/60 rounded-xl px-3 py-2">
              "{preview!.message}"
            </p>
          )}
          {(preview!.invitee_name || preview!.invitee_dob) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {preview!.invitee_name && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg">
                  Tên gợi ý: {preview!.invitee_name}
                </span>
              )}
              {preview!.invitee_dob && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg">
                  Ngày sinh: {formatDate(preview!.invitee_dob)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="px-8 py-6">
          {/* Nếu đã đăng nhập */}
          {user ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Bạn đang đăng nhập với tài khoản <strong>{user.name}</strong>.
                Nhấn bên dưới để chấp nhận lời mời và kết nối với {preview!.inviter_name}.
              </p>
              <button onClick={handleAcceptAsLoggedIn} disabled={accepting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                <UserCheck size={18} />
                {accepting ? 'Đang kết nối...' : 'Chấp nhận lời mời'}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Hoặc{' '}
                <Link to="/" className="text-amber-500 hover:text-amber-600">về trang chủ</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <GitBranch size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Tham gia gia đình</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Đăng ký hoặc đăng nhập để kết nối</p>
              </div>

              {/* Tab switch */}
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-5">
                <button onClick={() => setMode('register')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'register' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  Đăng ký mới
                </button>
                <button onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  Đã có tài khoản
                </button>
              </div>

              {mode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Họ và tên</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      placeholder={preview!.invitee_name ?? 'Nguyễn Văn A'} className={inputClass} />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm">
                    {submitting ? 'Đang đăng ký...' : 'Đăng ký và kết nối'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="ten@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                        placeholder="Mật khẩu" className={`${inputClass} pr-11`} />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm">
                    {submitting ? 'Đang đăng nhập...' : 'Đăng nhập và kết nối'}
                  </button>
                </form>
              )}

              {/* OAuth */}
              <div className="mt-5 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">hoặc</span>
                  </div>
                </div>

                <a href={oauthLink('google')}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[48px]">
                  <GoogleIcon /> Tiếp tục với Google
                </a>
                <a href={oauthLink('facebook')}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[48px]">
                  <FacebookIcon /> Tiếp tục với Facebook
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
