import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

// Trang trung gian: nhận token từ OAuth redirect, lưu vào localStorage rồi chuyển trang
export function AuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Lưu token tạm, fetch user info rồi login
    localStorage.setItem('giapha_token', token);
    api.get<User>('/auth/me')
      .then(user => {
        login(token, user);
        navigate('/', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('giapha_token');
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Đang đăng nhập...</p>
      </div>
    </div>
  );
}
